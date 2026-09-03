"use client";

import { useActionState } from "react";
import { atualizarIntervaloClt } from "./actions";

export default function IntervaloCltForm({
  funcionariosBaterIntervaloAtual,
}: {
  funcionariosBaterIntervaloAtual: boolean;
}) {
  const [state, formAction, pending] = useActionState(atualizarIntervaloClt, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Intervalo dos funcionários (CLT)</h2>
        <p className="text-xs text-stone-500 mt-1">
          Se ligado, todo funcionário CLT precisa bater a saída e a volta do
          intervalo no totem, além da entrada e saída do dia. Vale pra todos
          os funcionários — não dá pra configurar por pessoa.
        </p>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
        <input
          type="checkbox"
          name="funcionariosBaterIntervalo"
          defaultChecked={funcionariosBaterIntervaloAtual}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span>
          <span className="block text-sm font-medium text-navy-900">
            Exigir intervalo intrajornada no totem
          </span>
          <span className="block text-xs text-stone-500">
            Desligado por padrão — só entrada e saída do dia.
          </span>
        </span>
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
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
