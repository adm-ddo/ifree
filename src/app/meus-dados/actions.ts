"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { requireSessao, hashSenha, verificarSenha, SESSAO_COOKIE } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type MeusDadosState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarMeusDados(
  _prev: MeusDadosState,
  formData: FormData
): Promise<MeusDadosState> {
  const sessao = await requireSessao();

  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!nomeCompleto || !email) {
    return { erro: "Preencha todos os campos." };
  }

  const emailExistente = await prisma.usuario.findUnique({ where: { email } });
  if (emailExistente && emailExistente.id !== sessao.usuarioId) {
    return { erro: "Já existe uma conta com este e-mail." };
  }

  await prisma.usuario.update({
    where: { id: sessao.usuarioId },
    data: { nomeCompleto, email },
  });

  revalidatePath("/meus-dados");
  revalidatePath("/v2/meus-dados");
  revalidatePath("/", "layout");
  return { sucesso: true };
}

export type TrocarSenhaState = { erro?: string; sucesso?: boolean } | undefined;

export async function trocarSenha(
  _prev: TrocarSenhaState,
  formData: FormData
): Promise<TrocarSenhaState> {
  const sessao = await requireSessao();

  const senhaAtual = String(formData.get("senhaAtual") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!senhaAtual || !novaSenha || !confirmarSenha) {
    return { erro: "Preencha todos os campos." };
  }
  if (novaSenha.length < 8) {
    return { erro: "A nova senha deve ter pelo menos 8 caracteres." };
  }
  if (novaSenha !== confirmarSenha) {
    return { erro: "As senhas não conferem." };
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } });
  if (!(await verificarSenha(senhaAtual, usuario.senhaHash))) {
    return { erro: "Senha atual incorreta." };
  }

  const tokenAtual = (await cookies()).get(SESSAO_COOKIE)?.value ?? "";

  const senhaHash = await hashSenha(novaSenha);
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: sessao.usuarioId }, data: { senhaHash } }),
    // Trocar a senha derruba as outras sessões ativas, mas mantém a sessão
    // atual (quem trocou não precisa logar de novo na hora).
    prisma.sessao.deleteMany({
      where: { usuarioId: sessao.usuarioId, token: { not: tokenAtual } },
    }),
  ]);

  return { sucesso: true };
}
