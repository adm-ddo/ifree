"use server";

import { prisma } from "@/lib/prisma";
import { verificarSenha } from "@/lib/auth";
import { criarSessaoPessoa } from "@/lib/auth-pessoa";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { redirect } from "next/navigation";

export type EntrarPessoaState =
  | { erro?: string; semAcesso?: boolean; naoEncontrado?: boolean }
  | undefined;

export async function entrarPessoa(
  _prev: EntrarPessoaState,
  formData: FormData
): Promise<EntrarPessoaState> {
  const cpfBruto = String(formData.get("cpf") ?? "");
  const senha = String(formData.get("senha") ?? "");

  if (!cpfValido(cpfBruto) || !senha) {
    return { erro: "Informe um CPF válido e sua senha." };
  }

  const documento = apenasDigitos(cpfBruto);
  const pessoa = await prisma.pessoa.findUnique({ where: { documento } });

  if (!pessoa) {
    return {
      erro: "CPF não encontrado. Você nunca trabalhou por uma empresa que usa o iFREE?",
      naoEncontrado: true,
    };
  }
  if (!pessoa.senhaHash) {
    return { erro: "Você ainda não configurou seu acesso ao Portal.", semAcesso: true };
  }
  if (!(await verificarSenha(senha, pessoa.senhaHash))) {
    return { erro: "CPF ou senha incorretos." };
  }

  await criarSessaoPessoa(pessoa.id);
  redirect("/portal");
}
