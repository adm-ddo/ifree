"use client";

import { useActionState } from "react";
import { minutosParaHorario } from "@/lib/ponto";

const DIAS = [
  { valor: 1, label: "Segunda" },
  { valor: 2, label: "Terça" },
  { valor: 3, label: "Quarta" },
  { valor: 4, label: "Quinta" },
  { valor: 5, label: "Sexta" },
  { valor: 6, label: "Sábado" },
  { valor: 7, label: "Domingo" },
];

export type RestricaoHorarioState = { erro?: string; sucesso?: boolean } | undefined;

type RestricaoAtual = { diaSemana: number; horaMinimaMin: number | null; horaMaximaMin: number | null };

/** Trava de horário pra bater ENTRADA no totem, configurável por dia da
 * semana — reaproveitado tanto em /freelancers/[id] (EXTRA) quanto em
 * /funcionarios/[id] (CLT), já que a restrição mora no vínculo (mesmo
 * modelo pros dois tipos). A action é injetada por quem usa o
 * componente porque cada rota tem seu próprio arquivo de actions
 * (mesmo padrão de ConverterVinculoButton). */
export default function RestricaoHorarioForm({
  pessoaId,
  restricoesAtuais,
  action,
}: {
  pessoaId: number;
  restricoesAtuais: RestricaoAtual[];
  action: (state: RestricaoHorarioState, formData: FormData) => Promise<RestricaoHorarioState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const porDia = new Map(restricoesAtuais.map((r) => [r.diaSemana, r]));

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Restrição de horário pra bater ponto</h2>
        <p className="text-xs text-stone-500 mt-1">
          Bloqueia a entrada (não a saída) fora da janela definida em cada
          dia — ex.: só libera a partir das 14h. Deixe os dois campos em
          branco pra não restringir nada nesse dia, igual sempre foi.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {DIAS.map((dia) => {
          const atual = porDia.get(dia.valor);
          return (
            <div key={dia.valor} className="grid grid-cols-[5.5rem_1fr_1fr] items-end gap-2">
              <span className="text-sm text-stone-700 pb-2">{dia.label}</span>
              <label className="flex flex-col gap-1 text-xs text-stone-600">
                A partir de
                <input
                  type="time"
                  name={`horaMinima_${dia.valor}`}
                  defaultValue={atual?.horaMinimaMin != null ? minutosParaHorario(atual.horaMinimaMin) : ""}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-stone-600">
                Até
                <input
                  type="time"
                  name={`horaMaxima_${dia.valor}`}
                  defaultValue={atual?.horaMaximaMin != null ? minutosParaHorario(atual.horaMaximaMin) : ""}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
            </div>
          );
        })}
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Restrições salvas.
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
