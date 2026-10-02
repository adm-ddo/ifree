"use client";

import { useActionState, useState, useTransition } from "react";
import { criarApiKeyExterna, revogarApiKeyExterna, type CriarApiKeyState } from "./actions";

type Chave = {
  id: number;
  nome: string;
  prefixo: string;
  criadoEm: Date;
  ultimoUsoEm: Date | null;
  revogadaEm: Date | null;
};

function formatarData(data: Date | null): string {
  if (!data) return "nunca";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(
    data
  );
}

export default function ApiKeysManager({ chaves }: { chaves: Chave[] }) {
  const [state, formAction, pending] = useActionState<CriarApiKeyState, FormData>(criarApiKeyExterna, undefined);
  const [copiado, setCopiado] = useState(false);
  const [revogandoId, setRevogandoId] = useState<number | null>(null);
  const [erroRevogar, setErroRevogar] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const chaveGerada = state && "chave" in state ? state.chave : null;

  function revogar(id: number) {
    if (!window.confirm("Revogar essa chave? Quem estiver usando ela pra consultar o iFREE perde o acesso na hora — não tem como desfazer.")) {
      return;
    }
    setErroRevogar(null);
    setRevogandoId(id);
    startTransition(async () => {
      try {
        const resultado = await revogarApiKeyExterna(id);
        if (resultado && "erro" in resultado) setErroRevogar(resultado.erro);
      } catch {
        setErroRevogar("Não foi possível revogar agora.");
      } finally {
        setRevogandoId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {chaveGerada ? (
        <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4 flex flex-col gap-2">
          <h2 className="font-bold text-navy-900 text-sm">✅ Chave gerada</h2>
          <p className="text-xs text-stone-600">
            Copie agora — por segurança, essa é a única vez que ela aparece inteira. Se perder, só gerando outra.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs bg-white border border-stone-200 rounded-lg px-3 py-2 break-all flex-1 min-w-0">
              {chaveGerada}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(chaveGerada);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1500);
              }}
              className="rounded-lg border border-stone-300 bg-white text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50 shrink-0"
            >
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      ) : (
        <form
          action={formAction}
          onReset={(e) => e.preventDefault()}
          className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm text-stone-700 flex-1 min-w-[200px]">
            Nome da chave
            <input
              name="nome"
              type="text"
              placeholder="Ex.: Sistema financeiro"
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
          >
            {pending ? "Gerando..." : "🔑 Gerar nova chave"}
          </button>
        </form>
      )}

      {state && "erro" in state && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.erro}</p>
      )}

      {chaves.length === 0 ? (
        <p className="text-sm text-stone-500">Nenhuma chave gerada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {chaves.map((chave) => (
            <li
              key={chave.id}
              className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium text-navy-900 text-sm">
                  {chave.nome}{" "}
                  <code className="text-xs text-stone-400 font-normal">{chave.prefixo}…</code>
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Criada em {formatarData(chave.criadoEm)} · Último uso: {formatarData(chave.ultimoUsoEm)}
                </p>
                {chave.revogadaEm && (
                  <p className="text-xs text-red-600 mt-0.5">🚫 Revogada em {formatarData(chave.revogadaEm)}</p>
                )}
              </div>
              {!chave.revogadaEm && (
                <button
                  type="button"
                  onClick={() => revogar(chave.id)}
                  disabled={revogandoId === chave.id}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50 shrink-0"
                >
                  {revogandoId === chave.id ? "Revogando..." : "Revogar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {erroRevogar && <p className="text-sm text-red-600">{erroRevogar}</p>}
    </div>
  );
}
