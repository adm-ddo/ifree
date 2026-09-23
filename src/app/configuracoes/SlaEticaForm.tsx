"use client";

import { useActionState } from "react";
import { atualizarSlaEtica } from "./actions";

export default function SlaEticaForm({ slaDenunciaDiasAtual }: { slaDenunciaDiasAtual: number }) {
  const [state, formAction, pending] = useActionState(atualizarSlaEtica, undefined);

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">SLA da Central de Ética</h2>
        <p className="text-xs text-stone-500 mt-1">
          Prazo (em dias corridos, a partir do recebimento) considerado
          dentro do prazo pra tratar uma denúncia — usado só pro alerta
          &ldquo;SLA vencido&rdquo; no painel.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700 max-w-[10rem]">
        Dias
        <input
          type="number"
          name="slaDenunciaDias"
          min={1}
          max={365}
          defaultValue={slaDenunciaDiasAtual}
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Configuração salva.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-6"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
