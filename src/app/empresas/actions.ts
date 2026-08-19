"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessao, SESSAO_COOKIE } from "@/lib/auth";
import { lerDadosEmpresa, type DadosEmpresaState } from "@/lib/empresa";

export async function selecionarEmpresa(empresaId: number) {
  const sessao = await requireSessao();

  // Checagem de posse: só pode selecionar uma empresa que realmente é sua.
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId: sessao.usuarioId, empresaId } },
  });
  if (!vinculo) {
    throw new Error("Essa empresa não pertence a este login.");
  }

  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (!token) redirect("/login");

  await prisma.sessao.update({
    where: { token },
    data: { empresaAtivaId: empresaId },
  });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export type NovaEmpresaState = DadosEmpresaState;

export async function cadastrarNovaEmpresa(
  _prev: NovaEmpresaState,
  formData: FormData
): Promise<NovaEmpresaState> {
  const sessao = await requireSessao();

  const resultado = lerDadosEmpresa(formData);
  if ("erro" in resultado) return resultado;

  const empresa = await prisma.$transaction(async (tx) => {
    const novaEmpresa = await tx.empresa.create({ data: resultado.dados });
    await tx.usuarioEmpresa.create({
      data: { usuarioId: sessao.usuarioId, empresaId: novaEmpresa.id },
    });
    return novaEmpresa;
  });

  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (token) {
    await prisma.sessao.update({
      where: { token },
      data: { empresaAtivaId: empresa.id },
    });
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function removerEmpresa(empresaId: number) {
  const sessao = await requireSessao();

  await prisma.usuarioEmpresa.deleteMany({
    where: { usuarioId: sessao.usuarioId, empresaId },
  });

  // Se a empresa removida era a ativa nesta sessão, limpa a seleção.
  if (sessao.empresaAtivaId === empresaId) {
    const token = (await cookies()).get(SESSAO_COOKIE)?.value;
    if (token) {
      await prisma.sessao.update({
        where: { token },
        data: { empresaAtivaId: null },
      });
    }
  }

  revalidatePath("/empresas");
  revalidatePath("/", "layout");
}

/** Apaga a empresa de verdade (funções, totens, turnos, pagamentos — tudo
 * junto, via cascata do schema). Diferente de removerEmpresa, que só tira o
 * vínculo deste login sem mexer nos dados. */
export async function excluirEmpresa(empresaId: number) {
  const sessao = await requireSessao();

  // Checagem de posse: só quem tem vínculo com essa empresa pode apagar.
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId: sessao.usuarioId, empresaId } },
  });
  if (!vinculo) {
    throw new Error("Essa empresa não pertence a este login.");
  }

  await prisma.empresa.delete({ where: { id: empresaId } });

  revalidatePath("/empresas");
  revalidatePath("/", "layout");
}
