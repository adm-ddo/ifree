"use client";

import { useActionState, useState } from "react";
import { atualizarSemanaPagamento } from "./actions";
import { DIAS_SEMANA_ISO } from "@/lib/data";

function nomeDoFimDaSemana(inicioDia: number): string {
  const fimDia = ((inicioDia + 5) % 7) + 1; // 6 dias depois, no padrão ISO 1-7
  return DIAS_SEMANA_ISO.find((d) => d.valor === fimDia)?.label ?? "";
}

export default function SemanaPagamentoForm({
  inicioDiaAtual,
  diaPagamentoAtual,
}: {
  inicioDiaAtual: number;
  diaPagamentoAtual: number;
}) {
  const [state, formAction, pending] = useActionState(atualizarSemanaPagamento, undefined);
  const [inicioDia, setInicioDia] = useState(inicioDiaAtual);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Semana de pagamento</h2>
        <p className="text-xs text-stone-500 mt-1">
          Pra quem está com frequência de pagamento &ldquo;Semanal&rdquo;
          (configurado em cada freelancer) — de qual dia a qual dia a semana
          conta, e em qual dia o valor acumulado é pago.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Semana começa em
          <select
            name="semanaPagamentoInicioDia"
            value={inicioDia}
            onChange={(e) => setInicioDia(Number(e.target.value))}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {DIAS_SEMANA_ISO.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Até
          <input
            type="text"
            disabled
            value={nomeDoFimDaSemana(inicioDia)}
            className="border border-stone-200 bg-stone-50 rounded-lg px-3 py-2 text-stone-500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Dia do pagamento
        <select
          name="semanaPagamentoDia"
          defaultValue={diaPagamentoAtual}
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {DIAS_SEMANA_ISO.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.label}
            </option>
          ))}
        </select>
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
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
