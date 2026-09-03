"use client";

import { useTransition, type ReactNode } from "react";
import Link from "next/link";
import { aceitarCandidatura, recusarCandidatura } from "./actions";
import { formatarDataHora } from "@/lib/data";

const LABEL_STATUS: Record<string, string> = {
  ENVIADA: "Aguardando resposta",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

const COR_STATUS: Record<string, string> = {
  ENVIADA: "bg-amber-50 text-amber-700 border-amber-200",
  ACEITA: "bg-brand-50 text-brand-700 border-brand-200",
  RECUSADA: "bg-stone-100 text-stone-500 border-stone-200",
};

type Pessoa = {
  id: number;
  nome: string;
  telefone: string;
  biografia: string | null;
  habilidades: string[];
  vagasDesejadas: string[];
  meiosTransporte: string[];
  fotoDataUrl: string | null;
};

export default function CandidaturaCard({
  vagaId,
  candidatura,
  pessoa,
  reputacaoCard,
  conversaId,
}: {
  vagaId: number;
  candidatura: { id: number; status: "ENVIADA" | "ACEITA" | "RECUSADA"; match: boolean; criadoEm: Date };
  pessoa: Pessoa;
  reputacaoCard: ReactNode;
  conversaId: number | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
          {pessoa.fotoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL vindo do servidor, não faz sentido pelo next/image
            <img src={pessoa.fotoDataUrl} alt={pessoa.nome} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl text-stone-300">👤</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/vagas/${vagaId}/candidatos/${pessoa.id}`}
              className="font-medium text-navy-900 hover:text-brand-700 underline underline-offset-2"
            >
              {pessoa.nome}
            </Link>
            <span className={`rounded-full border text-[11px] font-medium px-2 py-0.5 ${COR_STATUS[candidatura.status]}`}>
              {LABEL_STATUS[candidatura.status]}
            </span>
            {candidatura.match && (
              <span className="rounded-full border border-brand-500 bg-brand-50 text-brand-700 text-[11px] font-bold px-2 py-0.5">
                🎯 Match
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {pessoa.telefone} · candidatou-se em {formatarDataHora(candidatura.criadoEm)}
          </p>
        </div>
      </div>

      {pessoa.biografia && <p className="text-sm text-stone-600">{pessoa.biografia}</p>}

      {pessoa.habilidades.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pessoa.habilidades.map((h) => (
            <span key={h} className="rounded-full border border-brand-200 bg-brand-50 text-xs text-brand-700 px-2.5 py-1">
              {h}
            </span>
          ))}
        </div>
      )}

      {pessoa.meiosTransporte.length > 0 && (
        <p className="text-xs text-stone-500">Transporte: {pessoa.meiosTransporte.join(", ")}</p>
      )}

      {reputacaoCard}

      <div className="flex items-center gap-3 flex-wrap">
        {candidatura.status === "ENVIADA" && (
          <>
            <button
              disabled={pending}
              onClick={() => startTransition(() => aceitarCandidatura(candidatura.id))}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
            >
              Aceitar
            </button>
            <button
              disabled={pending}
              onClick={() => startTransition(() => recusarCandidatura(candidatura.id))}
              className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Recusar
            </button>
          </>
        )}
        {candidatura.match && conversaId && (
          <Link href={`/conversas/${conversaId}`} className="text-sm text-brand-700 underline">
            💬 Conversar
          </Link>
        )}
      </div>
    </li>
  );
}
