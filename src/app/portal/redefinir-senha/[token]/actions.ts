"use server";

import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/auth";
import { buscarTokenValidoPessoa } from "@/lib/tokenAutenticacaoPessoa";
import { redirect } from "next/navigation";

export type RedefinirSenhaState = { erro?: string } | undefined;

const ERRO_TOKEN_INVALIDO = "Esse link não é mais válido — peça um novo em \"Esqueci minha senha\".";

export async function redefinirSenhaPessoa(
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

  const resultado = await buscarTokenValidoPessoa(token, "RECUPERACAO_SENHA");
  if (!resultado.valido) {
    return { erro: ERRO_TOKEN_INVALIDO };
  }

  const senhaHash = await hashSenha(novaSenha);

  await prisma.$transaction([
    prisma.pessoa.update({ where: { id: resultado.pessoaId }, data: { senhaHash } }),
    prisma.tokenAutenticacaoPessoa.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
    prisma.sessaoPessoa.deleteMany({ where: { pessoaId: resultado.pessoaId } }),
  ]);

  redirect("/portal/entrar");
}
