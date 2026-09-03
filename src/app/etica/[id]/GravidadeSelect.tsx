"use client";

import { useTransition } from "react";
import { definirGravidadeDenuncia } from "../actions";
import type { GravidadeDenuncia } from "@/generated/prisma/enums";

const OPCOES: { valor: GravidadeDenuncia; label: string; cor: string }[] = [
  { valor: "BAIXA", label: "Baixa", cor: "bg-stone-100 border-stone-300 text-stone-700" },
  { valor: "MEDIA", label: "Média", cor: "bg-amber-50 border-amber-300 text-amber-700" },
  { valor: "ALTA", label: "Alta", cor: "bg-red-50 border-red-300 text-red-700" },
];

/** Classificação manual por enquanto (sem IA) — ver contexto em
 * src/lib/etica.ts. Fica pronto pra, no futuro, uma IA preencher esse
 * mesmo campo automaticamente, sem mudar nada da UI aqui. */
export default function GravidadeSelect({
  denunciaId,
  gravidadeAtual,
}: {
  denunciaId: number;
  gravidadeAtual: GravidadeDenuncia | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <h2 className="font-semibold text-navy-900 text-sm">Gravidade</h2>
      <p className="text-xs text-stone-500">
        Classificação manual — a empresa decide (sem IA por enquanto).
      </p>
      <div className="flex flex-wrap gap-2">
        {OPCOES.map((op) => (
          <button
            key={op.valor}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => definirGravidadeDenuncia(denunciaId, op.valor))}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              gravidadeAtual === op.valor ? op.cor : "border-stone-300 text-stone-500 hover:bg-stone-50"
            }`}
          >
            {gravidadeAtual === op.valor ? "✓ " : ""}
            {op.label}
          </button>
        ))}
      </div>
    </div>
  );
}
