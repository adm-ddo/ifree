"use client";

import { useActionState } from "react";
import { atualizarHorarioEscalaClt } from "./actions";
import { minutosParaHorario } from "@/lib/ponto";

type Par = { entrada: number | null; saida: number | null };

export default function EscalaHorarioCltForm({
  cincoXDois,
  cincoXDoisNoite,
  seisXUm,
  seisXUmNoite,
  dozeXTrintaSeis,
  dozeXTrintaSeisNoite,
}: {
  cincoXDois: Par;
  cincoXDoisNoite: Par;
  seisXUm: Par;
  seisXUmNoite: Par;
  dozeXTrintaSeis: Par;
  dozeXTrintaSeisNoite: Par;
}) {
  const [state, formAction, pending] = useActionState(atualizarHorarioEscalaClt, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Horário por escala (CLT)</h2>
        <p className="text-xs text-stone-500 mt-1">
          Horário padrão de entrada e saída pra cada escala, um pro turno
          da manhã e outro pro turno da noite — quando preenchido, o
          sistema passa a avisar quando alguém bate ponto fora do horário
          (chegou atrasado ou saiu antes da hora). Deixe em branco pra não
          comparar nada, igual sempre foi. Cada funcionário escolhe qual
          turno segue (e pode ter um horário próprio, diferente dos dois
          padrões) no cadastro dele.
        </p>
      </div>

      <EscalaGrupo
        titulo="5x2"
        entradaManhaName="horarioEntrada5x2"
        saidaManhaName="horarioSaida5x2"
        valorManha={cincoXDois}
        entradaNoiteName="horarioEntrada5x2Noite"
        saidaNoiteName="horarioSaida5x2Noite"
        valorNoite={cincoXDoisNoite}
      />
      <EscalaGrupo
        titulo="6x1"
        entradaManhaName="horarioEntrada6x1"
        saidaManhaName="horarioSaida6x1"
        valorManha={seisXUm}
        entradaNoiteName="horarioEntrada6x1Noite"
        saidaNoiteName="horarioSaida6x1Noite"
        valorNoite={seisXUmNoite}
      />
      <EscalaGrupo
        titulo="12x36"
        entradaManhaName="horarioEntrada12x36"
        saidaManhaName="horarioSaida12x36"
        valorManha={dozeXTrintaSeis}
        entradaNoiteName="horarioEntrada12x36Noite"
        saidaNoiteName="horarioSaida12x36Noite"
        valorNoite={dozeXTrintaSeisNoite}
      />

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

function EscalaGrupo({
  titulo,
  entradaManhaName,
  saidaManhaName,
  valorManha,
  entradaNoiteName,
  saidaNoiteName,
  valorNoite,
}: {
  titulo: string;
  entradaManhaName: string;
  saidaManhaName: string;
  valorManha: Par;
  entradaNoiteName: string;
  saidaNoiteName: string;
  valorNoite: Par;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-stone-100 bg-stone-50 p-3">
      <span className="text-sm font-medium text-stone-700">{titulo}</span>
      <ParHorario titulo="☀️ Manhã" entradaName={entradaManhaName} saidaName={saidaManhaName} valor={valorManha} />
      <ParHorario titulo="🌙 Noite" entradaName={entradaNoiteName} saidaName={saidaNoiteName} valor={valorNoite} />
    </div>
  );
}

function ParHorario({
  titulo,
  entradaName,
  saidaName,
  valor,
}: {
  titulo: string;
  entradaName: string;
  saidaName: string;
  valor: Par;
}) {
  return (
    <div className="grid grid-cols-[5rem_1fr_1fr] items-end gap-2">
      <span className="text-xs text-stone-600 pb-2">{titulo}</span>
      <label className="flex flex-col gap-1 text-xs text-stone-600">
        Entrada
        <input
          type="time"
          name={entradaName}
          defaultValue={valor.entrada !== null ? minutosParaHorario(valor.entrada) : ""}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-stone-600">
        Saída
        <input
          type="time"
          name={saidaName}
          defaultValue={valor.saida !== null ? minutosParaHorario(valor.saida) : ""}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </label>
    </div>
  );
}
