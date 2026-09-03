"use client";

import { useTransition } from "react";
import Link from "next/link";
import { alternarAtivoFuncionario } from "./actions";
import { formatarCpf } from "@/lib/cpf";
import { LABEL_ESCALA_TRABALHO } from "@/lib/ponto";
import type { EscalaTrabalho } from "@/generated/prisma/enums";

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
};

export default function FuncionarioRow({ funcionario }: { funcionario: Funcionario }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/funcionarios/${funcionario.pessoaId}`} className="hover:underline">
        <p className="font-medium text-navy-900">
          {funcionario.nome}{" "}
          {funcionario.dataRescisaoLabel ? (
            <span className="text-xs text-red-600 font-normal">
              (rescindido em {funcionario.dataRescisaoLabel})
            </span>
          ) : (
            !funcionario.ativo && (
              <span className="text-xs text-red-600 font-normal">(desativado)</span>
            )
          )}{" "}
          {funcionario.feriasRetornoLabel && (
            <span className="text-xs text-brand-700 font-normal">
              (🏖️ de férias — retorna em {funcionario.feriasRetornoLabel})
            </span>
          )}
        </p>
        <p className="text-xs text-stone-500">
          CPF {formatarCpf(funcionario.documento)} · {funcionario.telefone}
          {funcionario.escalaTrabalho && ` · Escala ${LABEL_ESCALA_TRABALHO[funcionario.escalaTrabalho]}`}
          {funcionario.salarioMensal !== null && ` · R$ ${funcionario.salarioMensal.toFixed(2)}/mês`}
        </p>
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
        className={`rounded-lg border text-sm px-3 py-1.5 disabled:opacity-50 shrink-0 ${
          funcionario.ativo
            ? "border-stone-300 text-stone-700 hover:bg-stone-50"
            : "border-brand-300 text-brand-700 hover:bg-brand-50"
        }`}
      >
        {funcionario.ativo ? "Desativar" : "Reativar"}
      </button>
    </li>
  );
}
