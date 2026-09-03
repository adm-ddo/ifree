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
  horarioInicioDiaMin,
  horarioInicioNoiteMin,
  horarioFechamentoDiaMin,
  horarioFechamentoNoiteMin,
}: {
  horarioInicioDiaMin: number;
  horarioInicioNoiteMin: number;
  horarioFechamentoDiaMin: number;
  horarioFechamentoNoiteMin: number;
}) {
  const [state, formAction, pending] = useActionState(atualizarHorarioFechamento, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Turnos do dia e da noite</h2>
        <p className="text-xs text-stone-500 mt-1">
          O início de cada turno decide se quem não tem um turno fixo
          configurado (livre) é classificado como dia ou noite ao entrar —
          quem chega bem antes do início da noite mas depois do meio do
          caminho entre os dois já conta como turno da noite. O fim de
          cada turno é o horário que o sistema usa pra encerrar sozinho
          quem esquecer de bater saída.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          ☀️ Início do turno do dia
          <input
            type="time"
            name="horarioInicioDia"
            defaultValue={minutosParaHoraMin(horarioInicioDiaMin)}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          🌙 Início do turno da noite
          <input
            type="time"
            name="horarioInicioNoite"
            defaultValue={minutosParaHoraMin(horarioInicioNoiteMin)}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          ☀️ Fim do turno do dia
          <input
            type="time"
            name="horarioFechamentoDia"
            defaultValue={minutosParaHoraMin(horarioFechamentoDiaMin)}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          🌙 Fim do turno da noite
          <input
            type="time"
            name="horarioFechamentoNoite"
            defaultValue={minutosParaHoraMin(horarioFechamentoNoiteMin)}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

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
