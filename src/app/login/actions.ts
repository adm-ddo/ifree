"use server";

import { prisma } from "@/lib/prisma";
import { criarSessao, verificarSenha } from "@/lib/auth";
import { criarTokenAutenticacao, tokenRecenteExiste } from "@/lib/tokenAutenticacao";
import { enviarEmailVerificacao } from "@/lib/email";
import { redirect } from "next/navigation";

export type LoginState = { erro?: string; naoVerificado?: boolean } | undefined;

export async function entrar(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !(await verificarSenha(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha incorretos." };
  }

  if (usuario.emailVerificadoEm === null) {
    return {
      erro: "Confirme seu e-mail antes de entrar — veja o link que mandamos pra você.",
      naoVerificado: true,
    };
  }

  await criarSessao(usuario.id);
  redirect(usuario.isMaster ? "/master" : "/dashboard");
}

export type ReenviarVerificacaoState = { erro?: string; sucesso?: boolean } | undefined;

/** Gera um novo link de confirmação — usada quando a pessoa tenta
 * logar sem ter confirmado o e-mail ainda. Sempre resposta genérica
 * (não revela se o e-mail existe na base), mesmo cuidado do fluxo de
 * recuperação de senha. */
export async function reenviarVerificacaoEmail(
  _prev: ReenviarVerificacaoState,
  formData: FormData
): Promise<ReenviarVerificacaoState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario && usuario.emailVerificadoEm === null) {
    const jaTemTokenRecente = await tokenRecenteExiste(usuario.id, "VERIFICACAO_EMAIL", 2);
    if (!jaTemTokenRecente) {
      const token = await criarTokenAutenticacao(usuario.id, "VERIFICACAO_EMAIL", 24);
      await enviarEmailVerificacao(email, usuario.nomeCompleto ?? "", token);
    }
  }

  return { sucesso: true };
}
