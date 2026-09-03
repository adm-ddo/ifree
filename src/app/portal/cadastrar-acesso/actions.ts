"use server";

import { prisma } from "@/lib/prisma";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { criarTokenAutenticacaoPessoa, tokenRecenteExistePessoa } from "@/lib/tokenAutenticacaoPessoa";
import { enviarEmailVerificacaoPessoa } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SolicitarAcessoState =
  | { fase: "erro"; erro: string; naoEncontrado?: boolean }
  | { fase: "precisa-email"; documento: string; erro?: string }
  | { fase: "enviado" }
  | undefined;

/** Fluxo em duas etapas por causa da regra de segurança: CPF não é
 * segredo, então o link de confirmação só pode ir pro e-mail que JÁ está
 * salvo no cadastro da Pessoa (preenchido pelo dono ou no totem) — nunca
 * pra um e-mail novo digitado aqui. Só pede um e-mail nesta tela quando a
 * Pessoa nunca teve nenhum cadastrado (primeira vez), e nesse caso ele
 * vira o e-mail salvo dali pra frente. */
export async function solicitarAcessoPessoa(
  _prev: SolicitarAcessoState,
  formData: FormData
): Promise<SolicitarAcessoState> {
  const documentoOculto = String(formData.get("documento") ?? "");
  const documento = documentoOculto || apenasDigitos(String(formData.get("cpf") ?? ""));

  if (!cpfValido(documento)) {
    return { fase: "erro", erro: "Informe um CPF válido." };
  }

  const pessoa = await prisma.pessoa.findUnique({ where: { documento } });
  if (!pessoa) {
    return {
      fase: "erro",
      erro: "CPF não encontrado. Você nunca trabalhou por uma empresa que usa o iFREE?",
      naoEncontrado: true,
    };
  }
  if (pessoa.senhaHash) {
    return {
      fase: "erro",
      erro: "Esse CPF já tem acesso configurado — use \"Entrar\" ou \"Esqueci minha senha\".",
    };
  }

  let destinoEmail = pessoa.email;

  if (!destinoEmail) {
    const emailEnviado = formData.get("email");
    if (emailEnviado === null) {
      return { fase: "precisa-email", documento };
    }
    const email = String(emailEnviado).trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return { fase: "precisa-email", documento, erro: "Informe um e-mail válido." };
    }
    await prisma.pessoa.update({ where: { id: pessoa.id }, data: { email } });
    destinoEmail = email;
  }

  const jaTemTokenRecente = await tokenRecenteExistePessoa(pessoa.id, "VERIFICACAO_EMAIL", 2);
  if (!jaTemTokenRecente) {
    const token = await criarTokenAutenticacaoPessoa(pessoa.id, "VERIFICACAO_EMAIL", 24);
    await enviarEmailVerificacaoPessoa(destinoEmail, pessoa.nome, token);
  }

  return { fase: "enviado" };
}
