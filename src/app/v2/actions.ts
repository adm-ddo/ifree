"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessao, SESSAO_COOKIE } from "@/lib/auth";

/** Mesma lógica de selecionarEmpresa (src/app/empresas/actions.ts, v1, não
 * tocado) — só muda o redirect final. O original sempre manda pra
 * /dashboard (v1); usar ele direto na v2 jogaria o usuário de volta pro
 * layout antigo depois de trocar de empresa. Duplicada aqui em vez de
 * adicionar um parâmetro no v1, pra não arriscar o caminho já usado por
 * lá. */
export async function selecionarEmpresaV2(empresaId: number) {
  const sessao = await requireSessao();

  if (!sessao.minhasEmpresas.some((e) => e.id === empresaId)) {
    throw new Error("Essa empresa não pertence a este login.");
  }

  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (!token) redirect("/login");

  await prisma.sessao.update({
    where: { token },
    data: { empresaAtivaId: empresaId },
  });
  revalidatePath("/", "layout");
  redirect("/v2/dashboard");
}
