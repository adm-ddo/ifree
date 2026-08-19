"use client";

import { useTransition } from "react";
import Link from "next/link";
import { alternarAtivoVinculo } from "./actions";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import type { TipoDocumentoPessoa, TipoChavePix } from "@/generated/prisma/enums";

type Freelancer = {
  pessoaId: number;
  nome: string;
  documento: string;
  tipoDocumento: TipoDocumentoPessoa;
  telefone: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
  ativo: boolean;
};

export default function FreelancerRow({ freelancer }: { freelancer: Freelancer }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/freelancers/${freelancer.pessoaId}`} className="hover:underline">
        <p className="font-medium text-navy-900">
          {freelancer.nome}{" "}
          {!freelancer.ativo && (
            <span className="text-xs text-red-600 font-normal">(desativado)</span>
          )}
        </p>
        <p className="text-xs text-stone-500">
          {LABEL_TIPO_DOCUMENTO[freelancer.tipoDocumento]}{" "}
          {formatarDocumento(freelancer.tipoDocumento, freelancer.documento)} ·{" "}
          {freelancer.telefone} · PIX ({LABEL_TIPO_CHAVE_PIX[freelancer.tipoChavePix]}):{" "}
          {freelancer.chavePix}
        </p>
      </Link>
      <button
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              freelancer.ativo
                ? `Desativar ${freelancer.nome}? Ele(a) não vai conseguir bater CPF no totem desta empresa até você reativar de novo.`
                : `Reativar ${freelancer.nome} nesta empresa?`
            )
          ) {
            startTransition(async () => {
              await alternarAtivoVinculo(freelancer.pessoaId, !freelancer.ativo);
            });
          }
        }}
        className={`rounded-lg border text-sm px-3 py-1.5 disabled:opacity-50 shrink-0 ${
          freelancer.ativo
            ? "border-stone-300 text-stone-700 hover:bg-stone-50"
            : "border-brand-300 text-brand-700 hover:bg-brand-50"
        }`}
      >
        {freelancer.ativo ? "Desativar" : "Reativar"}
      </button>
    </li>
  );
}
