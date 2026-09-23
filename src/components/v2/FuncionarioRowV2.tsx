"use client";

import { useTransition } from "react";
import Link from "next/link";
import { alternarAtivoFuncionario } from "@/app/funcionarios/actions";
import { formatarCpf } from "@/lib/cpf";
import { LABEL_ESCALA_TRABALHO } from "@/lib/ponto";
import AvatarPessoa from "@/components/AvatarPessoa";
import type { EscalaTrabalho, Sexo } from "@/generated/prisma/enums";

type Funcionario = {
  pessoaId: number;
  nome: string;
  documento: string;
  telefone: string;
  salarioMensal: number | null;
  escalaTrabalho: EscalaTrabalho | null;
  ativo: boolean;
  dataRescisaoLabel: string | null;
  feriasRetornoLabel: string | null;
  temFoto: boolean;
  sexo: Sexo | null;
};

/** Mesma lógica/props de src/app/funcionarios/FuncionarioRow.tsx (v1, não
 * tocado) — link do nome vai pro /v2/funcionarios/[id], com AvatarPessoa
 * (foto do Conecta + bonequinho por gênero) igual ao FreelancerRowV2. */
export default function FuncionarioRowV2({ funcionario }: { funcionario: Funcionario }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-xl bg-white border border-stone-200 p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/v2/funcionarios/${funcionario.pessoaId}`} className="flex items-center gap-3 min-w-0">
        <AvatarPessoa pessoaId={funcionario.pessoaId} nome={funcionario.nome} temFoto={funcionario.temFoto} sexo={funcionario.sexo} />
        <div className="min-w-0">
          <p className="font-bold text-[13px] text-navy-900">
            {funcionario.nome}{" "}
            {funcionario.dataRescisaoLabel ? (
              <span className="text-[11px] text-red-600 font-normal">(rescindido em {funcionario.dataRescisaoLabel})</span>
            ) : (
              !funcionario.ativo && <span className="text-[11px] text-red-600 font-normal">(desativado)</span>
            )}{" "}
            {funcionario.feriasRetornoLabel && (
              <span className="text-[11px] text-brand-700 font-normal">
                (🏖️ de férias — retorna em {funcionario.feriasRetornoLabel})
              </span>
            )}
          </p>
          <p className="text-[11px] text-stone-500">
            CPF {formatarCpf(funcionario.documento)} · {funcionario.telefone}
            {funcionario.escalaTrabalho && ` · Escala ${LABEL_ESCALA_TRABALHO[funcionario.escalaTrabalho]}`}
            {funcionario.salarioMensal !== null && ` · R$ ${funcionario.salarioMensal.toFixed(2)}/mês`}
          </p>
        </div>
      </Link>
      <button
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              funcionario.ativo
                ? `Desativar ${funcionario.nome}? Ele(a) não vai conseguir bater ponto no totem desta empresa até você reativar de novo.`
                : `Reativar ${funcionario.nome} nesta empresa?`
            )
          ) {
            startTransition(async () => {
              await alternarAtivoFuncionario(funcionario.pessoaId, !funcionario.ativo);
            });
          }
        }}
        className={`rounded-full border text-xs font-bold px-3 py-1.5 disabled:opacity-50 shrink-0 ${
          funcionario.ativo ? "border-stone-200 text-stone-700" : "border-brand-300 text-brand-700"
        }`}
      >
        {funcionario.ativo ? "Desativar" : "Reativar"}
      </button>
    </li>
  );
}
