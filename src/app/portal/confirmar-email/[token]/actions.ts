"use server";

import { prisma } from "@/lib/prisma";
import { buscarTokenValidoPessoa } from "@/lib/tokenAutenticacaoPessoa";

export type ConfirmarTrocaEmailState = { erro?: string; sucesso?: boolean } | undefined;

const ERRO_TOKEN_INVALIDO = "Esse link não é mais válido — peça a troca de e-mail de novo no Portal.";

/** Consome o token só quando a pessoa clica no botão de confirmar (mesmo
 * motivo de confirmarVerificacaoEmail, src/app/verificar-email/[token]/actions.ts:
 * evita que um scanner de segurança de e-mail corporativo, que abre o link
 * sozinho pra checar phishing, gaste o token antes de a pessoa de verdade
 * clicar). Diferente do fluxo de primeiro acesso (definirSenhaPessoa): não
 * cria sessão nenhuma aqui — quem clicou pode estar num aparelho diferente
 * de onde está logada no Portal, e a troca de e-mail já não depende de
 * logar de novo pra valer. */
export async function confirmarTrocaEmail(
  _prev: ConfirmarTrocaEmailState,
  formData: FormData
): Promise<ConfirmarTrocaEmailState> {
  const token = String(formData.get("token") ?? "");
  const resultado = await buscarTokenValidoPessoa(token, "TROCA_EMAIL");
  if (!resultado.valido || !resultado.novoEmailPendente) {
    return { erro: ERRO_TOKEN_INVALIDO };
  }

  const jaUsadoPorOutra = await prisma.pessoa.findFirst({
    where: { email: resultado.novoEmailPendente, id: { not: resultado.pessoaId } },
    select: { id: true },
  });
  if (jaUsadoPorOutra) {
    return { erro: "Esse e-mail passou a estar em uso por outro cadastro — peça a troca de novo com outro endereço." };
  }

  await prisma.$transaction([
    prisma.pessoa.update({
      where: { id: resultado.pessoaId },
      data: { email: resultado.novoEmailPendente },
    }),
    prisma.tokenAutenticacaoPessoa.update({
      where: { id: resultado.tokenId },
      data: { usadoEm: new Date() },
    }),
  ]);

  return { sucesso: true };
}
