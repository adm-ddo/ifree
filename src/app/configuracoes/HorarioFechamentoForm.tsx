"use client";

import { useActionState } from "react";
import { atualizarHorarioFechamento } from "./actions";

function minutosParaHoraMin(minutos: number): string {
  const h = Math.floor(minutos / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function HorarioFechamentoForm({
  horarioFechamentoMin,
}: {
  horarioFechamentoMin: number;
}) {
  const [state, formAction, pending] = useActionState(atualizarHorarioFechamento, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Fechamento automático de turnos</h2>
        <p className="text-xs text-stone-500 mt-1">
          Se alguém esquecer de bater saída no totem, o sistema encerra o
          turno sozinho às 01:00 usando este horário como saída — o horário
          oficial em que a empresa fecha.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700 max-w-[10rem]">
        Horário de fechamento
        <input
          type="time"
          name="horarioFechamento"
          defaultValue={minutosParaHoraMin(horarioFechamentoMin)}
          required
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
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
