"use client";

import { useActionState } from "react";
import { atualizarModoPausa } from "./actions";
import type { ModoPausa } from "@/generated/prisma/enums";

const OPCOES: { valor: ModoPausa; label: string; desc: string }[] = [
  {
    valor: "NENHUMA",
    label: "Nenhuma",
    desc: "Paga o turno inteiro, sem descontar intervalo.",
  },
  {
    valor: "AUTOMATICA_30",
    label: "30 min automático",
    desc: "Desconta 30min do cálculo em turnos acima de 6h, sem exigir nada da pessoa.",
  },
  {
    valor: "AUTOMATICA_60",
    label: "60 min automático",
    desc: "Desconta 1h do cálculo em turnos acima de 6h, sem exigir nada da pessoa.",
  },
];

export default function PausaForm({ modoPausaAtual }: { modoPausaAtual: ModoPausa }) {
  const [state, formAction, pending] = useActionState(atualizarModoPausa, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Intervalo / pausa</h2>
        <p className="text-xs text-stone-500 mt-1">
          Como descontar o tempo de pausa (banheiro, cigarro, refeição) do
          cálculo de turnos longos. Recomendamos avisar isso nos{" "}
          <span className="font-medium">termos do contrato</span> acima, pra
          não virar surpresa no recibo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {OPCOES.map((op) => (
          <label
            key={op.valor}
            className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer"
          >
            <input
              type="radio"
              name="modoPausa"
              value={op.valor}
              defaultChecked={modoPausaAtual === op.valor}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-navy-900">{op.label}</span>
              <span className="block text-xs text-stone-500">{op.desc}</span>
            </span>
          </label>
        ))}
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
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
