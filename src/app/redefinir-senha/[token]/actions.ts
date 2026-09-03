"use server";

import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/auth";
import { buscarTokenValido } from "@/lib/tokenAutenticacao";
import { redirect } from "next/navigation";

export type RedefinirSenhaState = { erro?: string } | undefined;

const ERRO_TOKEN_INVALIDO =
  "Esse link não é mais válido — peça um novo em 'Esqueci minha senha'.";

export async function redefinirSenha(
  _prev: RedefinirSenhaState,
  formData: FormData
): Promise<RedefinirSenhaState> {
  const token = String(formData.get("token") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!novaSenha || !confirmarSenha) {
    return { erro: "Preencha todos os campos." };
  }
  if (novaSenha.length < 8) {
    return { erro: "A nova senha deve ter pelo menos 8 caracteres." };
  }
  if (novaSenha !== confirmarSenha) {
    return { erro: "As senhas não conferem." };
  }

  const resultado = await buscarTokenValido(token, "RECUPERACAO_SENHA");
  if (!resultado.valido) {
    return { erro: ERRO_TOKEN_INVALIDO };
  }

  const senhaHash = await hashSenha(novaSenha);

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: resultado.usuarioId }, data: { senhaHash } }),
    prisma.tokenAutenticacao.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
    prisma.sessao.deleteMany({ where: { usuarioId: resultado.usuarioId } }),
  ]);

  redirect("/login");
}
