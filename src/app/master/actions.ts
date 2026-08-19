"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMaster, requireSessao, SESSAO_COOKIE } from "@/lib/auth";

/** Acesso total do master a uma empresa: cria/edita/apaga como se fosse a
 * própria empresa, sem restrição — não é um modo "demonstração". */
export async function acessarEmpresa(empresaId: number) {
  await requireMaster();
  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (!token) redirect("/login");

  await prisma.sessao.update({
    where: { token },
    data: { empresaAtivaId: empresaId },
  });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Vincula o próprio login do master a uma empresa que já existe (criada
 * por outro usuário, ou sem dono) — pra ela aparecer em "Minhas empresas" e
 * no seletor rápido do dashboard, sem precisar recadastrar nada. Não tira
 * o vínculo de quem já é dono, só adiciona o master como dono também. */
export async function vincularEmpresaAoMeuLogin(empresaId: number) {
  const sessao = await requireMaster();
  await prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: sessao.usuarioId, empresaId } },
    update: {},
    create: { usuarioId: sessao.usuarioId, empresaId },
  });
  revalidatePath("/master");
  revalidatePath("/empresas");
  revalidatePath("/", "layout");
}

/** Exclusão de qualquer empresa pelo master — sem checagem de vínculo, já
 * que o master tem acesso total por definição. */
export async function excluirEmpresaMaster(empresaId: number) {
  await requireMaster();
  await prisma.empresa.delete({ where: { id: empresaId } });
  revalidatePath("/master");
  revalidatePath("/", "layout");
}

/** Exclusão de uma conta de dono — remove só o login (e os vínculos dele
 * com empresas, que ficam "sem dono" se não tiverem outro usuário). Nunca
 * apaga outro master por aqui, mesmo que o id seja forjado. */
export async function excluirUsuarioMaster(usuarioId: number) {
  await requireMaster();
  const alvo = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { isMaster: true },
  });
  if (!alvo || alvo.isMaster) return;
  await prisma.usuario.delete({ where: { id: usuarioId } });
  revalidatePath("/master");
}

export async function voltarParaMaster() {
  const sessao = await requireSessao();
  if (!sessao.isMaster) redirect("/dashboard");

  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (token) {
    await prisma.sessao.update({
      where: { token },
      data: { empresaAtivaId: null },
    });
  }
  revalidatePath("/", "layout");
  redirect("/master");
}
