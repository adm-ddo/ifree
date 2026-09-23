"use client";

import { useActionState } from "react";
import { corrigirSaidaTurno } from "../actions";

export default function CorrigirSaidaForm({
  turnoId,
  horaSaidaAtualValue,
}: {
  turnoId: number;
  horaSaidaAtualValue: string;
}) {
  const [state, formAction, pending] = useActionState(corrigirSaidaTurno, undefined);

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="turnoId" value={turnoId} />
      <div>
        <h2 className="font-semibold text-navy-900 text-sm">Corrigir horário de saída</h2>
        <p className="text-xs text-stone-500 mt-1">
          Use quando a pessoa esqueceu de bater a saída (ou deu algum
          problema técnico) e o sistema encerrou sozinho com o horário
          errado — as horas e o valor são recalculados pelo horário certo.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Horário de saída correto
          <input
            type="datetime-local"
            name="horaSaida"
            defaultValue={horaSaidaAtualValue}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
        >
          {pending ? "Corrigindo..." : "Corrigir saída"}
        </button>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Horário de saída corrigido e valor recalculado.
        </p>
      )}
    </form>
  );
}
