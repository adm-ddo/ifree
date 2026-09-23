"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireResponsavelPgr, garantirTokenPgr, abrirCicloPgr, encerrarCicloPgr, buscarCicloAbertoPgr } from "@/lib/pgr";
import type { StatusAcaoPgr } from "@/generated/prisma/enums";

export async function gerarLinkPublicoPgr(): Promise<string> {
  const sessao = await requireResponsavelPgr();
  return garantirTokenPgr(sessao.empresaEfetivoId);
}

export async function abrirNovoCicloPgr(): Promise<void> {
  const sessao = await requireResponsavelPgr();
  await abrirCicloPgr(sessao.empresaEfetivoId);
  revalidatePath("/v2/pgr");
}

/** Encerra o ciclo aberto da empresa — sempre confere que o ciclo
 * pertence mesmo à empresa da sessão antes de encerrar, nunca confia só
 * no id vindo do form. */
export async function encerrarCicloAtualPgr(): Promise<void> {
  const sessao = await requireResponsavelPgr();
  const ciclo = await buscarCicloAbertoPgr(sessao.empresaEfetivoId);
  if (!ciclo) return;
  await encerrarCicloPgr(ciclo.id);
  revalidatePath("/v2/pgr");
}

export type AcaoPgrState = { erro?: string; sucesso?: boolean } | undefined;

export async function criarAcaoPgr(_prev: AcaoPgrState, formData: FormData): Promise<AcaoPgrState> {
  const sessao = await requireResponsavelPgr();

  const dimensao = String(formData.get("dimensao") ?? "").trim();
  const descricaoRisco = String(formData.get("descricaoRisco") ?? "").trim();
  const medida = String(formData.get("medida") ?? "").trim();
  const responsavel = String(formData.get("responsavel") ?? "").trim();
  const prazoBruta = String(formData.get("prazo") ?? "").trim();

  if (!dimensao || !descricaoRisco || !medida) {
    return { erro: "Preencha a dimensão, o risco identificado e a medida." };
  }

  await prisma.acaoPgr.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      dimensao,
      descricaoRisco,
      medida,
      responsavel: responsavel || null,
      prazo: prazoBruta ? new Date(`${prazoBruta}T00:00:00-03:00`) : null,
    },
  });

  revalidatePath("/v2/pgr");
  return { sucesso: true };
}

/** Avança/reverte o status de uma ação do plano — sempre confere que a
 * ação pertence à empresa da sessão antes de alterar. */
export async function atualizarStatusAcaoPgr(acaoId: number, status: StatusAcaoPgr): Promise<void> {
  const sessao = await requireResponsavelPgr();
  await prisma.acaoPgr.updateMany({
    where: { id: acaoId, empresaId: sessao.empresaEfetivoId },
    data: { status, concluidoEm: status === "CONCLUIDA" ? new Date() : null },
  });
  revalidatePath("/v2/pgr");
}

export async function excluirAcaoPgr(acaoId: number): Promise<void> {
  const sessao = await requireResponsavelPgr();
  await prisma.acaoPgr.deleteMany({ where: { id: acaoId, empresaId: sessao.empresaEfetivoId } });
  revalidatePath("/v2/pgr");
}
