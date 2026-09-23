"use server";

import { prisma } from "@/lib/prisma";
import { criarSessao, hashSenha } from "@/lib/auth";
import { criarTokenAutenticacao } from "@/lib/tokenAutenticacao";
import { enviarEmailVerificacao } from "@/lib/email";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { captchaValido } from "@/lib/captcha";
import { redirect } from "next/navigation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CadastroState = { erro?: string; sucesso?: boolean } | undefined;

export async function cadastrarConta(
  _prev: CadastroState,
  formData: FormData
): Promise<CadastroState> {
  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const cpf = apenasDigitos(String(formData.get("cpf") ?? ""));

  if (!(await captchaValido(formData))) {
    return { erro: "Verificação de segurança falhou. Atualize a página e tente de novo." };
  }

  if (!nomeCompleto || !email || !senha || !cpf) {
    return { erro: "Preencha todos os campos." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { erro: "Informe um e-mail válido." };
  }
  if (senha.length < 8) {
    return { erro: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (!cpfValido(cpf)) {
    return { erro: "CPF inválido." };
  }

  const emailExistente = await prisma.usuario.findUnique({ where: { email } });
  if (emailExistente) {
    return { erro: "Já existe uma conta com este e-mail." };
  }
  const cpfExistente = await prisma.usuario.findUnique({ where: { cpf } });
  if (cpfExistente) {
    return { erro: "Já existe uma conta com este CPF." };
  }

  const senhaHash = await hashSenha(senha);

  const usuario = await prisma.usuario.create({
    data: { nomeCompleto, email, senhaHash, cpf },
  });

  // Sem criarSessao aqui de propósito — login só libera depois que a
  // pessoa clicar no link do e-mail (ver src/app/verificar-email/[token]/page.tsx).
  const token = await criarTokenAutenticacao(usuario.id, "VERIFICACAO_EMAIL", 24);
  const envio = await enviarEmailVerificacao(email, nomeCompleto, token);

  if (!envio.sucesso) {
    // Provedor de e-mail fora do ar ou ainda não configurado (RESEND_API_KEY
    // ausente) — não faz sentido travar o acesso de alguém que não tem
    // como receber o link de confirmação. Libera direto, mesmo
    // comportamento de antes desta feature existir.
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { emailVerificadoEm: new Date() },
    });
    await criarSessao(usuario.id);
    redirect("/v2/empresas");
  }

  return { sucesso: true };
}
