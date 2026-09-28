"use client";

import { useActionState } from "react";
import { corrigirEntradaTurno } from "../actions";

export default function CorrigirEntradaForm({
  turnoId,
  horaEntradaAtualValue,
}: {
  turnoId: number;
  horaEntradaAtualValue: string;
}) {
  const [state, formAction, pending] = useActionState(corrigirEntradaTurno, undefined);

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="turnoId" value={turnoId} />
      <div>
        <h2 className="font-semibold text-navy-900 text-sm">Corrigir horário de entrada</h2>
        <p className="text-xs text-stone-500 mt-1">
          Use quando a pessoa não bateu a entrada de verdade (ex.: bateu só
          a saída do dia anterior, e isso virou a "entrada" deste turno por
          engano) — as horas e o valor são recalculados pelo horário certo.
          Corrigir aqui NÃO libera o pagamento sozinho — confira o valor
          corrigido e libere manualmente abaixo.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Horário de entrada correto
          <input
            type="datetime-local"
            name="horaEntrada"
            defaultValue={horaEntradaAtualValue}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
        >
          {pending ? "Corrigindo..." : "Corrigir entrada"}
        </button>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Horário de entrada corrigido e valor recalculado — pagamento
          continua retido até você liberar.
        </p>
      )}
    </form>
  );
}
