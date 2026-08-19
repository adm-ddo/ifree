"use server";

import { prisma } from "@/lib/prisma";
import { criarSessao, verificarSenha } from "@/lib/auth";
import { redirect } from "next/navigation";

export type LoginState = { erro?: string } | undefined;

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

  await criarSessao(usuario.id);
  redirect(usuario.isMaster ? "/master" : "/dashboard");
}
