"use server";

import { prisma } from "@/lib/prisma";
import { buscarTokenValido } from "@/lib/tokenAutenticacao";
import { criarSessao } from "@/lib/auth";
import { redirect } from "next/navigation";

export type ConfirmarEmailState = { erro?: string } | undefined;

/** Consome o token só quando a pessoa clica no botão de confirmar — não
 * na simples abertura do link (GET). Isso evita que scanners de
 * segurança de e-mail corporativo, que abrem o link sozinhos pra
 * verificar se é phishing, gastem o token antes da pessoa de verdade
 * clicar. Verificar já loga direto, sem pedir senha de novo. */
export async function confirmarVerificacaoEmail(
  _prev: ConfirmarEmailState,
  formData: FormData
): Promise<ConfirmarEmailState> {
  const token = String(formData.get("token") ?? "");
  const resultado = await buscarTokenValido(token, "VERIFICACAO_EMAIL");
  if (!resultado.valido) {
    return { erro: "Esse link não é mais válido — peça um novo na tela de login." };
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: resultado.usuarioId },
      data: { emailVerificadoEm: new Date() },
    }),
    prisma.tokenAutenticacao.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
  ]);

  await criarSessao(resultado.usuarioId);
  redirect("/empresas");
}
