"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { revalidatePath } from "next/cache";

export type NovaFuncaoState = { erro?: string } | undefined;

export async function criarFuncao(
  _prev: NovaFuncaoState,
  formData: FormData
): Promise<NovaFuncaoState> {
  const sessao = await requireModulo("funcoes");
  const nome = String(formData.get("nome") ?? "").trim();
  const valorHoraStr = String(formData.get("valorHoraPadrao") ?? "").replace(",", ".");
  const valorHoraPadrao = Number(valorHoraStr);

  if (!nome) return { erro: "Dê um nome pra função (ex: Garçom, Cozinha)." };
  if (!Number.isFinite(valorHoraPadrao) || valorHoraPadrao <= 0) {
    return { erro: "Informe um valor/hora válido, maior que zero." };
  }

  const existente = await prisma.funcao.findUnique({
    where: { empresaId_nome: { empresaId: sessao.empresaEfetivoId, nome } },
  });
  if (existente) return { erro: "Já existe uma função com esse nome." };

  await prisma.funcao.create({
    data: { empresaId: sessao.empresaEfetivoId, nome, valorHoraPadrao },
  });

  revalidatePath("/funcoes");
}

async function funcaoDaEmpresa(funcaoId: number) {
  const sessao = await requireModulo("funcoes");
  const funcao = await prisma.funcao.findUnique({ where: { id: funcaoId } });
  if (!funcao || funcao.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Essa função não pertence a esta empresa.");
  }
  return funcao;
}

export async function alternarAtivoFuncao(funcaoId: number, ativo: boolean) {
  await funcaoDaEmpresa(funcaoId);
  await prisma.funcao.update({ where: { id: funcaoId }, data: { ativo } });
  revalidatePath("/funcoes");
}

export async function atualizarValorHoraFuncao(funcaoId: number, valorHoraPadrao: number) {
  await funcaoDaEmpresa(funcaoId);
  if (!Number.isFinite(valorHoraPadrao) || valorHoraPadrao <= 0) {
    throw new Error("Valor/hora inválido.");
  }
  await prisma.funcao.update({ where: { id: funcaoId }, data: { valorHoraPadrao } });
  revalidatePath("/funcoes");
}

export type AtualizarNomeState = { erro?: string };

/** Retorna { erro } em vez de lançar exceção — chamada direto pelo campo
 * de nome (sem <form action>), e o caso mais comum de erro aqui (nome
 * duplicado) é bem provável de acontecer na prática, diferente do valor
 * numérico acima (já validado pelo próprio input). */
export async function atualizarNomeFuncao(
  funcaoId: number,
  nome: string
): Promise<AtualizarNomeState> {
  const funcao = await funcaoDaEmpresa(funcaoId);

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { erro: "O nome não pode ficar em branco." };
  if (nomeLimpo === funcao.nome) return {};

  const existente = await prisma.funcao.findUnique({
    where: { empresaId_nome: { empresaId: funcao.empresaId, nome: nomeLimpo } },
  });
  if (existente) return { erro: "Já existe uma função com esse nome." };

  await prisma.funcao.update({ where: { id: funcaoId }, data: { nome: nomeLimpo } });
  revalidatePath("/funcoes");
  return {};
}

export async function excluirFuncao(funcaoId: number) {
  await funcaoDaEmpresa(funcaoId);
  await prisma.funcao.delete({ where: { id: funcaoId } });
  revalidatePath("/funcoes");
}
