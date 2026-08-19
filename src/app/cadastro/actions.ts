"use server";

import { prisma } from "@/lib/prisma";
import { criarSessao, hashSenha } from "@/lib/auth";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { redirect } from "next/navigation";

export type CadastroState = { erro?: string } | undefined;

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

  if (!nomeCompleto || !email || !senha || !cpf) {
    return { erro: "Preencha todos os campos." };
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

  await criarSessao(usuario.id);
  redirect("/empresas");
}
