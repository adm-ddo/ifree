"use client";

import { useTransition } from "react";
import { atualizarStatusAcaoPgr, excluirAcaoPgr } from "./actions";
import { LABEL_DIMENSAO_PGR, type DimensaoPgr } from "@/lib/pgr-questionario";
import type { StatusAcaoPgr } from "@/generated/prisma/enums";

const LABEL_STATUS: Record<StatusAcaoPgr, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

const COR_STATUS: Record<StatusAcaoPgr, string> = {
  PENDENTE: "bg-stone-100 text-stone-600 border-stone-200",
  EM_ANDAMENTO: "bg-amber-50 text-amber-700 border-amber-200",
  CONCLUIDA: "bg-brand-50 text-brand-700 border-brand-200",
};

type Acao = {
  id: number;
  dimensao: string;
  descricaoRisco: string;
  medida: string;
  responsavel: string | null;
  prazoLabel: string | null;
  status: StatusAcaoPgr;
};

export default function AcaoPgrRow({ acao }: { acao: Acao }) {
  const [pending, startTransition] = useTransition();
  const dimensaoLabel = LABEL_DIMENSAO_PGR[acao.dimensao as DimensaoPgr] ?? acao.dimensao;

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-500">{dimensaoLabel}</p>
          <p className="text-sm text-navy-900 mt-0.5">{acao.descricaoRisco}</p>
        </div>
        <span className={`text-xs rounded-full border px-2 py-1 shrink-0 ${COR_STATUS[acao.status]}`}>
          {LABEL_STATUS[acao.status]}
        </span>
      </div>
      <p className="text-sm text-stone-600">
        <strong className="text-stone-700">Medida:</strong> {acao.medida}
      </p>
      <p className="text-xs text-stone-500">
        {acao.responsavel && `Responsável: ${acao.responsavel}`}
        {acao.responsavel && acao.prazoLabel && " · "}
        {acao.prazoLabel && `Prazo: ${acao.prazoLabel}`}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA"] as const)
          .filter((s) => s !== acao.status)
          .map((status) => (
            <button
              key={status}
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => atualizarStatusAcaoPgr(acao.id, status))}
              className="text-xs rounded-full border border-stone-300 px-3 py-1 text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              Marcar {LABEL_STATUS[status].toLowerCase()}
            </button>
          ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Remover essa ação do plano?")) {
              startTransition(() => excluirAcaoPgr(acao.id));
            }
          }}
          className="text-xs text-red-600 hover:underline disabled:opacity-50 ml-auto"
        >
          Remover
        </button>
      </div>
    </li>
  );
}
