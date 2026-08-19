"use server";

import { prisma } from "@/lib/prisma";
import { requireSessao, hashSenha } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type EquipeState = { erro?: string; sucesso?: boolean } | undefined;

/** Cria um login novo com acesso total às empresas selecionadas — só entre
 * as empresas que o próprio usuário logado já tem acesso, nunca uma
 * empresa arbitrária. Sempre cria conta nova (não "convida" uma conta já
 * existente por e-mail, pra não dar acesso à empresa de alguém digitando o
 * e-mail de uma conta de terceiro por engano). */
export async function criarAcessoSecundario(
  _prev: EquipeState,
  formData: FormData
): Promise<EquipeState> {
  const sessao = await requireSessao();

  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const empresaIds = formData
    .getAll("empresaIds")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  if (!nomeCompleto || !email || !senha) {
    return { erro: "Preencha nome, e-mail e senha." };
  }
  if (senha.length < 8) {
    return { erro: "A senha deve ter pelo menos 8 caracteres." };
  }

  const minhasIds = new Set(sessao.minhasEmpresas.map((e) => e.id));
  const idsValidos = empresaIds.filter((id) => minhasIds.has(id));
  if (idsValidos.length === 0) {
    return { erro: "Selecione pelo menos uma empresa." };
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return { erro: "Já existe uma conta com esse e-mail." };
  }

  const senhaHash = await hashSenha(senha);
  await prisma.usuario.create({
    data: {
      nomeCompleto,
      email,
      senhaHash,
      empresas: { create: idsValidos.map((empresaId) => ({ empresaId })) },
    },
  });

  revalidatePath("/equipe");
  return { sucesso: true };
}

/** Concede ou revoga o acesso de um membro da equipe a UMA empresa —
 * sempre checando que a empresa é de fato do usuário logado (nunca mexe
 * no acesso de uma empresa que não é sua) e que o alvo não é o próprio
 * usuário logado nem uma conta master. */
export async function alternarAcessoEquipe(
  usuarioId: number,
  empresaId: number,
  conceder: boolean
): Promise<void> {
  const sessao = await requireSessao();

  const minhaEmpresa = sessao.minhasEmpresas.some((e) => e.id === empresaId);
  if (!minhaEmpresa) return;
  if (usuarioId === sessao.usuarioId) return;

  const alvo = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { isMaster: true },
  });
  if (!alvo || alvo.isMaster) return;

  if (conceder) {
    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
      update: {},
      create: { usuarioId, empresaId },
    });
  } else {
    await prisma.usuarioEmpresa.deleteMany({ where: { usuarioId, empresaId } });
  }

  revalidatePath("/equipe");
}
