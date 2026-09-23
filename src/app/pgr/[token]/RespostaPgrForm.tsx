"use client";

import { useActionState, useEffect, useSyncExternalStore } from "react";
import { enviarRespostaPgrPublica } from "./actions";
import { PERGUNTAS_PGR, ORDEM_DIMENSOES_PGR, LABEL_DIMENSAO_PGR, OPCOES_LIKERT_PGR } from "@/lib/pgr-questionario";

function chaveLocalStorage(token: string): string {
  return `pgr-respondido-${token}`;
}

// Sem evento nenhum pra assinar de verdade (localStorage não dispara
// "storage" na mesma aba que escreveu) — só usa useSyncExternalStore
// pelo par getSnapshot/getServerSnapshot, que já resolve certinho a
// leitura client-only sem cair no aviso de "setState dentro de effect"
// (ver react-hooks/set-state-in-effect) nem em mismatch de hidratação.
function inscrever(): () => void {
  return () => {};
}

function jaRespondeuAntes(token: string): () => boolean {
  return () => {
    try {
      return Boolean(localStorage.getItem(chaveLocalStorage(token)));
    } catch {
      return false;
    }
  };
}

export default function RespostaPgrForm({ token, cargosAtivos }: { token: string; cargosAtivos: string[] }) {
  const [state, formAction, pending] = useActionState(enviarRespostaPgrPublica.bind(null, token), undefined);
  const jaRespondeu = useSyncExternalStore(inscrever, jaRespondeuAntes(token), () => false);

  useEffect(() => {
    if (state && "sucesso" in state) {
      try {
        localStorage.setItem(chaveLocalStorage(token), "1");
      } catch {
        // só um lembrete de UX, não uma proteção de verdade — nunca trava o envio.
      }
    }
  }, [state, token]);

  if (state && "sucesso" in state) {
    return (
      <div className="rounded-2xl border-2 border-brand-300 bg-brand-50 p-6 shadow-sm text-center">
        <h2 className="text-lg font-semibold text-navy-900">Obrigado por responder!</h2>
        <p className="text-sm text-stone-700 mt-2">
          Sua resposta foi registrada de forma anônima. Ela ajuda a empresa
          a identificar pontos de melhoria no ambiente de trabalho.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {jaRespondeu && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Parece que você já respondeu essa pesquisa neste navegador. Se foi
          engano, pode enviar de novo sem problema.
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-navy-900 block mb-1">
          Seu cargo/função (opcional)
        </label>
        <select
          name="cargo"
          defaultValue=""
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Prefiro não informar</option>
          {cargosAtivos.map((cargo) => (
            <option key={cargo} value={cargo}>
              {cargo}
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-500 mt-1">
          Ajuda a empresa a enxergar se um problema é geral ou concentrado
          numa função específica — só é usado se houver respostas
          suficientes daquela função pra não identificar ninguém.
        </p>
      </div>

      {ORDEM_DIMENSOES_PGR.map((dimensao) => (
        <div key={dimensao} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-4">
          <h2 className="font-semibold text-navy-900 text-sm">{LABEL_DIMENSAO_PGR[dimensao]}</h2>
          {PERGUNTAS_PGR.filter((p) => p.dimensao === dimensao).map((pergunta) => (
            <fieldset key={pergunta.id} className="flex flex-col gap-2">
              <legend className="text-sm text-stone-700">{pergunta.texto}</legend>
              <div className="flex flex-wrap gap-2">
                {OPCOES_LIKERT_PGR.map((opcao) => (
                  <label
                    key={opcao.valor}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700 has-[:checked]:bg-navy-900 has-[:checked]:text-white has-[:checked]:border-navy-900 cursor-pointer transition-colors"
                  >
                    <input type="radio" name={pergunta.id} value={opcao.valor} required className="sr-only" />
                    {opcao.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ))}

      {state && "erro" in state && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.erro}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium py-3 disabled:opacity-50 transition-colors"
      >
        {pending ? "Enviando..." : "Enviar resposta anônima"}
      </button>
    </form>
  );
}
