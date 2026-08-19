"use client";

import { useActionState } from "react";
import { atualizarLimiaresDiaria } from "./actions";

export default function DiariaForm({
  limiarMeiaHoras,
  limiarCompletaHoras,
}: {
  limiarMeiaHoras: number;
  limiarCompletaHoras: number;
}) {
  const [state, formAction, pending] = useActionState(atualizarLimiaresDiaria, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Diária (faixas de horas)</h2>
        <p className="text-xs text-stone-500 mt-1">
          Vale só pra freelancers configurados com pagamento por diária em{" "}
          <span className="font-medium">Freelancers</span> — define quanto do
          valor combinado eles recebem conforme o tempo trabalhado.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Até quantas horas paga só metade da diária
        <input
          type="number"
          name="limiarMeiaHoras"
          step="0.5"
          min="0.5"
          defaultValue={limiarMeiaHoras}
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        A partir de quantas horas paga a diária completa
        <input
          type="number"
          name="limiarCompletaHoras"
          step="0.5"
          min="0.5"
          defaultValue={limiarCompletaHoras}
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <p className="text-xs text-stone-500">
        Entre as duas faixas, paga 75% da diária.
      </p>

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
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
