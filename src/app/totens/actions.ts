"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { gerarTokenTotem } from "@/lib/totem";
import { revalidatePath } from "next/cache";

export type NovoTotemState = { erro?: string } | undefined;

export async function criarTotem(
  _prev: NovoTotemState,
  formData: FormData
): Promise<NovoTotemState> {
  const sessao = await requireTenant();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome pro totem (ex: Entrada Principal)." };

  await prisma.totem.create({
    data: { empresaId: sessao.empresaEfetivoId, nome, token: gerarTokenTotem() },
  });

  revalidatePath("/totens");
}

async function totemDaEmpresa(totemId: number) {
  const sessao = await requireTenant();
  const totem = await prisma.totem.findUnique({ where: { id: totemId } });
  if (!totem || totem.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Esse totem não pertence a esta empresa.");
  }
  return totem;
}

export async function alternarAtivoTotem(totemId: number, ativo: boolean) {
  await totemDaEmpresa(totemId);
  await prisma.totem.update({ where: { id: totemId }, data: { ativo } });
  revalidatePath("/totens");
}

/** Gera um token novo, invalidando o link/QR code antigo — usar quando um
 * tablet for perdido ou roubado, sem precisar desativar os outros totens. */
export async function rotacionarTokenTotem(totemId: number) {
  await totemDaEmpresa(totemId);
  await prisma.totem.update({
    where: { id: totemId },
    data: { token: gerarTokenTotem() },
  });
  revalidatePath("/totens");
}

export async function excluirTotem(totemId: number) {
  await totemDaEmpresa(totemId);
  await prisma.totem.delete({ where: { id: totemId } });
  revalidatePath("/totens");
}
