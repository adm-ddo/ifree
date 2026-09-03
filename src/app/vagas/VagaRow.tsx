"use client";

import { useTransition } from "react";
import Link from "next/link";
import { pausarVaga, reabrirVaga, encerrarVaga } from "./actions";
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

export default function VagaRow({ vaga }: { vaga: Vaga }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/vagas/${vaga.id}`} className="font-medium text-navy-900 hover:text-brand-700">
            {vaga.cargo}
          </Link>
          {vaga.candidaturasPendentes > 0 && (
            <Link
              href={`/vagas/${vaga.id}`}
              className="rounded-full bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold px-2.5 py-1 transition-colors animate-pulse"
            >
              🔔 {vaga.candidaturasPendentes} nova{vaga.candidaturasPendentes === 1 ? "" : "s"}
            </Link>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          Publicada em {formatarDataHora(vaga.criadoEm)} ·{" "}
          <Link href={`/vagas/${vaga.id}`} className="underline hover:text-brand-700">
            {vaga.candidaturas} candidatura{vaga.candidaturas === 1 ? "" : "s"}
          </Link>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span
          className={`rounded-full border text-[11px] font-medium px-2 py-0.5 ${COR_STATUS[vaga.status]}`}
        >
          {LABEL_STATUS[vaga.status]}
        </span>
        {vaga.status === "ABERTA" && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => pausarVaga(vaga.id))}
            className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Pausar
          </button>
        )}
        {vaga.status === "PAUSADA" && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => reabrirVaga(vaga.id))}
            className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
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
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 inline-block py-1.5 px-2"
          >
            Encerrar
          </button>
        )}
      </div>
    </li>
  );
}
