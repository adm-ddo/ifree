"use client";

import { useTransition, type ReactNode } from "react";
import Link from "next/link";
import { aceitarCandidatura, recusarCandidatura } from "@/app/vagas/[id]/actions";
import { formatarDataHora } from "@/lib/data";
import AvatarPessoa from "@/components/AvatarPessoa";
import type { Sexo } from "@/generated/prisma/enums";

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
  temFoto: boolean;
  sexo: Sexo | null;
};

/** Mesma lógica/props de src/app/vagas/[id]/CandidaturaCard.tsx (v1, não
 * tocado) — links do candidato e da conversa vão pro /v2 (já existem).
 * Usa AvatarPessoa (foto do Conecta + bonequinho por gênero) em vez do
 * emoji genérico do v1. */
export default function CandidaturaCardV2({
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
    <li className="rounded-xl bg-white border border-stone-200 p-3.5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <AvatarPessoa pessoaId={pessoa.id} nome={pessoa.nome} temFoto={pessoa.temFoto} sexo={pessoa.sexo} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/v2/vagas/${vagaId}/candidatos/${pessoa.id}`}
              className="font-bold text-[13px] text-navy-900 underline underline-offset-2"
            >
              {pessoa.nome}
            </Link>
            <span className={`rounded-full border text-[10px] font-bold px-2 py-0.5 ${COR_STATUS[candidatura.status]}`}>
              {LABEL_STATUS[candidatura.status]}
            </span>
            {candidatura.match && (
              <span className="rounded-full border border-brand-500 bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5">
                🎯 Match
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500">
            {pessoa.telefone} · candidatou-se em {formatarDataHora(candidatura.criadoEm)}
          </p>
        </div>
      </div>

      {pessoa.biografia && <p className="text-[13px] text-stone-600">{pessoa.biografia}</p>}

      {pessoa.habilidades.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pessoa.habilidades.map((h) => (
            <span key={h} className="rounded-full border border-brand-200 bg-brand-50 text-[11px] text-brand-700 px-2.5 py-1">
              {h}
            </span>
          ))}
        </div>
      )}

      {pessoa.meiosTransporte.length > 0 && (
        <p className="text-[11px] text-stone-500">Transporte: {pessoa.meiosTransporte.join(", ")}</p>
      )}

      {reputacaoCard}

      <div className="flex items-center gap-3 flex-wrap">
        {candidatura.status === "ENVIADA" && (
          <>
            <button
              disabled={pending}
              onClick={() => startTransition(() => aceitarCandidatura(candidatura.id))}
              className="rounded-full bg-brand-600 text-white text-xs font-bold px-4 py-2 disabled:opacity-50"
            >
              Aceitar
            </button>
            <button
              disabled={pending}
              onClick={() => startTransition(() => recusarCandidatura(candidatura.id))}
              className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 text-stone-700 disabled:opacity-50"
            >
              Recusar
            </button>
          </>
        )}
        {candidatura.match && conversaId && (
          <Link href={`/v2/conversas/${conversaId}`} className="text-xs font-bold text-brand-700 underline">
            💬 Conversar
          </Link>
        )}
      </div>
    </li>
  );
}
