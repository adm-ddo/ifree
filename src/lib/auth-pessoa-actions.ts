"use server";

import { redirect } from "next/navigation";
import { destruirSessaoPessoaAtual } from "@/lib/auth-pessoa";

export async function logoutPessoa() {
  await destruirSessaoPessoaAtual();
  redirect("/portal/entrar");
}
