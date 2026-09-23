"use client";

import { useTransition } from "react";
import Link from "next/link";
import { pausarVaga, reabrirVaga, encerrarVaga } from "@/app/vagas/actions";
import { formatarDataHora } from "@/lib/data";

const LABEL_STATUS: Record<string, string> = {
  ABERTA: "Aberta",
  PAUSADA: "Pausada",
  ENCERRADA: "Encerrada",
};

const COR_STATUS: Record<string, string> = {
  ABERTA: "bg-brand-50 text-brand-700 border-brand-200",
  PAUSADA: "bg-amber-50 text-amber-700 border-amber-200",
  ENCERRADA: "bg-stone-100 text-stone-500 border-stone-200",
};

type Vaga = {
  id: number;
  cargo: string;
  status: "ABERTA" | "PAUSADA" | "ENCERRADA";
  criadoEm: Date;
  candidaturas: number;
  candidaturasPendentes: number;
};

/** Mesma lógica/props de src/app/vagas/VagaRow.tsx (v1, não tocado) — só o
 * link da vaga muda, pro /v2/vagas/[id]. */
export default function VagaRowV2({ vaga }: { vaga: Vaga }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-xl bg-white border border-stone-200 p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/v2/vagas/${vaga.id}`} className="font-bold text-[13px] text-navy-900">
            {vaga.cargo}
          </Link>
          {vaga.candidaturasPendentes > 0 && (
            <Link
              href={`/v2/vagas/${vaga.id}`}
              className="rounded-full bg-brand-600 text-white text-[11px] font-bold px-2.5 py-1 animate-pulse"
            >
              🔔 {vaga.candidaturasPendentes} nova{vaga.candidaturasPendentes === 1 ? "" : "s"}
            </Link>
          )}
        </div>
        <p className="text-[11px] text-stone-500 mt-0.5">
          Publicada em {formatarDataHora(vaga.criadoEm)} ·{" "}
          <Link href={`/v2/vagas/${vaga.id}`} className="underline">
            {vaga.candidaturas} candidatura{vaga.candidaturas === 1 ? "" : "s"}
          </Link>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className={`rounded-full border text-[11px] font-bold px-2 py-0.5 ${COR_STATUS[vaga.status]}`}>
          {LABEL_STATUS[vaga.status]}
        </span>
        {vaga.status === "ABERTA" && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => pausarVaga(vaga.id))}
            className="rounded-full border border-stone-200 text-xs font-bold px-3 py-1.5 text-stone-700 disabled:opacity-50"
          >
            Pausar
          </button>
        )}
        {vaga.status === "PAUSADA" && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => reabrirVaga(vaga.id))}
            className="rounded-full border border-stone-200 text-xs font-bold px-3 py-1.5 text-stone-700 disabled:opacity-50"
          >
            Reabrir
          </button>
        )}
        {vaga.status !== "ENCERRADA" && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Encerrar a vaga "${vaga.cargo}"? Não dá pra reabrir depois.`)) {
                startTransition(() => encerrarVaga(vaga.id));
              }
            }}
            className="text-xs font-bold text-red-600 disabled:opacity-50 inline-block py-1.5 px-2"
          >
            Encerrar
          </button>
        )}
      </div>
    </li>
  );
}
