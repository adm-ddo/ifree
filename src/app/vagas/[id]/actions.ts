"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function candidaturaDaEmpresa(candidaturaId: number) {
  const sessao = await requireTenant();
  const candidatura = await prisma.candidatura.findUnique({
    where: { id: candidaturaId },
    include: { vaga: true },
  });
  if (!candidatura || candidatura.vaga.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Essa candidatura não pertence a esta empresa.");
  }
  return candidatura;
}

/** Aceitar cria (upsert) o VinculoPessoaEmpresa se ainda não existir —
 * mesmo padrão que o totem já usa no primeiro check-in (iniciarTurno,
 * src/app/t/[token]/actions.ts) — assim a pessoa já aparece em
 * /freelancers e pode bater ponto, sem passo manual extra pro dono. */
export async function aceitarCandidatura(candidaturaId: number) {
  const candidatura = await candidaturaDaEmpresa(candidaturaId);

  await prisma.$transaction([
    prisma.candidatura.update({ where: { id: candidaturaId }, data: { status: "ACEITA" } }),
    prisma.vinculoPessoaEmpresa.upsert({
      where: {
        pessoaId_empresaId: {
          pessoaId: candidatura.pessoaId,
          empresaId: candidatura.vaga.empresaId,
        },
      },
      update: {},
      create: {
        pessoaId: candidatura.pessoaId,
        empresaId: candidatura.vaga.empresaId,
      },
    }),
  ]);

  revalidatePath(`/vagas/${candidatura.vagaId}`);
  revalidatePath("/freelancers");
}

export async function recusarCandidatura(candidaturaId: number) {
  const candidatura = await candidaturaDaEmpresa(candidaturaId);
  await prisma.candidatura.update({ where: { id: candidaturaId }, data: { status: "RECUSADA" } });
  revalidatePath(`/vagas/${candidatura.vagaId}`);
}
