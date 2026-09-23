"use client";

import { useActionState, useState } from "react";
import { gerarConviteEquipe } from "./actions";
import { MODULOS_EQUIPE, CHAVES_TODOS_MODULOS, type ModuloEquipe } from "@/lib/modulosEquipe";
import LinkPublicoBox from "@/app/etica/LinkPublicoBox";

/** Única forma de dar acesso novo à equipe da empresa atual — decisão do
 * Thiago em 2026-09-22: nunca o dono digita a senha de outra pessoa, só
 * marca os módulos (ou usa "Marcar todos" pra acesso completo) e gera um
 * link de uso único (7 dias) pra compartilhar por fora do sistema; quem
 * abre o link define o próprio nome/e-mail/senha (ver
 * src/app/convite-equipe/[token]/) já nascendo só com esses módulos.
 * Sem seletor de empresa — sempre a empresa atual da sessão
 * (gerarConviteEquipe nunca aceita empresaId do cliente). */
export default function ConvidarPorLinkForm() {
  const [state, formAction, pending] = useActionState(gerarConviteEquipe, undefined);
  const [modulosMarcados, setModulosMarcados] = useState<Set<ModuloEquipe>>(new Set());

  function alternar(chave: ModuloEquipe) {
    setModulosMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Convidar pra equipe</h2>
        <p className="text-xs text-stone-500 mt-1">
          Marque os módulos que a pessoa vai poder ver (ou &ldquo;Marcar todos&rdquo; pra
          acesso completo), gere o link e envie por fora (WhatsApp, e-mail) —
          quem abrir define o próprio login e já nasce só com esse acesso.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-stone-500">Módulos liberados</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModulosMarcados(new Set(CHAVES_TODOS_MODULOS))}
              className="text-xs text-brand-700 hover:underline"
            >
              Marcar todos
            </button>
            <button
              type="button"
              onClick={() => setModulosMarcados(new Set())}
              className="text-xs text-stone-500 hover:underline"
            >
              Desmarcar todos
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-stone-200 p-2">
          {MODULOS_EQUIPE.map((modulo) => (
            <label key={modulo.chave} className="flex items-center gap-2 text-sm px-1 py-1">
              <input
                type="checkbox"
                name="modulos"
                value={modulo.chave}
                checked={modulosMarcados.has(modulo.chave)}
                onChange={() => alternar(modulo.chave)}
                className="h-4 w-4 accent-brand-600"
              />
              {modulo.label}
            </label>
          ))}
        </div>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.linkGerado && (
        <LinkPublicoBox
          url={state.linkGerado}
          titulo="Convite gerado"
          descricao="Válido por 7 dias e só pode ser usado uma vez. Envie pra pessoa certa — quem abrir o link já cria o próprio acesso com os módulos marcados acima."
        />
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Gerando..." : "Gerar convite"}
      </button>
    </form>
  );
}
