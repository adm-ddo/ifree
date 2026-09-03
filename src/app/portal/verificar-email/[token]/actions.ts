"use server";

import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/auth";
import { criarSessaoPessoa } from "@/lib/auth-pessoa";
import { buscarTokenValidoPessoa } from "@/lib/tokenAutenticacaoPessoa";
import { redirect } from "next/navigation";

export type DefinirSenhaState = { erro?: string } | undefined;

const ERRO_TOKEN_INVALIDO = "Esse link não é mais válido — peça um novo em \"Configurar acesso\".";

/** Diferente da verificação de e-mail do Usuario (que só confirma e já
 * loga, porque a senha já existe desde o cadastro): a Pessoa nunca teve
 * chance de definir senha antes, então este passo confirma o e-mail E
 * grava a senha ao mesmo tempo. */
export async function definirSenhaPessoa(
  _prev: DefinirSenhaState,
  formData: FormData
): Promise<DefinirSenhaState> {
  const token = String(formData.get("token") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!novaSenha || !confirmarSenha) {
    return { erro: "Preencha todos os campos." };
  }
  if (novaSenha.length < 8) {
    return { erro: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (novaSenha !== confirmarSenha) {
    return { erro: "As senhas não conferem." };
  }

  const resultado = await buscarTokenValidoPessoa(token, "VERIFICACAO_EMAIL");
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
  ]);

  await criarSessaoPessoa(resultado.pessoaId);
  redirect("/portal");
}
