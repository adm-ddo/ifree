"use client";

import { useTransition } from "react";
import Link from "next/link";
import { alternarAtivoVinculo } from "@/app/freelancers/actions";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import AvatarPessoa from "@/components/AvatarPessoa";
import type { TipoDocumentoPessoa, TipoChavePix, Sexo } from "@/generated/prisma/enums";

type Freelancer = {
  pessoaId: number;
  nome: string;
  documento: string;
  tipoDocumento: TipoDocumentoPessoa;
  telefone: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
  temFoto: boolean;
  sexo: Sexo | null;
  ativo: boolean;
};

/** Mesma lógica/props de src/app/freelancers/FreelancerRow.tsx (v1, não
 * tocado) — só o link do nome muda, pro /v2/freelancers/[id] (que agora
 * já existe), e o visual segue o idioma da v2. */
export default function FreelancerRowV2({ freelancer }: { freelancer: Freelancer }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-xl bg-white border border-stone-200 p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/v2/freelancers/${freelancer.pessoaId}`} className="flex items-center gap-3 min-w-0">
        <AvatarPessoa pessoaId={freelancer.pessoaId} nome={freelancer.nome} temFoto={freelancer.temFoto} sexo={freelancer.sexo} />
        <div className="min-w-0">
          <p className="font-bold text-[13px] text-navy-900">
            {freelancer.nome} {!freelancer.ativo && <span className="text-[11px] text-red-600 font-normal">(desativado)</span>}
          </p>
          <p className="text-[11px] text-stone-500">
            {LABEL_TIPO_DOCUMENTO[freelancer.tipoDocumento]} {formatarDocumento(freelancer.tipoDocumento, freelancer.documento)} ·{" "}
            {freelancer.telefone} · PIX ({LABEL_TIPO_CHAVE_PIX[freelancer.tipoChavePix]}): {freelancer.chavePix}
          </p>
        </div>
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
        className={`rounded-full border text-xs font-bold px-3 py-1.5 disabled:opacity-50 shrink-0 ${
          freelancer.ativo ? "border-stone-200 text-stone-700" : "border-brand-300 text-brand-700"
        }`}
      >
        {freelancer.ativo ? "Desativar" : "Reativar"}
      </button>
    </li>
  );
}
