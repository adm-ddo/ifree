"use server";

import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { cobrancaSeloService } from "@/lib/cobranca-selo";
import { valorDoSelo, referenciaMesAtual } from "@/lib/selo-freelancer";
import type { SeloFreelancer } from "@/generated/prisma/enums";

export type GerarCobrancaSeloState =
  | { erro: string }
  | { sucesso: true; idTransacaoExterna: string; qrCode: string; qrCodeImagemUrl: string | null; expiraEm: string }
  | undefined;

/** Gera (ou reaproveita, se já existir uma válida do mesmo mês) o PIX do
 * selo escolhido — mesmo molde de gerarCobrancaMensalidade
 * (src/app/assinatura/actions.ts), mais simples porque a sessão da Pessoa
 * já É o pessoaId (não precisa checar posse de empresa). Retorna { erro }
 * em vez de lançar exceção — chamada direto pelo client. */
export async function gerarCobrancaSelo(
  selo: Extract<SeloFreelancer, "PRATA" | "OURO">
): Promise<GerarCobrancaSeloState> {
  const sessao = await requirePessoaComTermosAceitos();
  const referenciaMes = referenciaMesAtual();

  const existente = await prisma.cobrancaSelo.findFirst({
    where: {
      pessoaId: sessao.pessoaId,
      selo,
      referenciaMes,
      status: "PENDENTE",
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: "desc" },
  });
  if (existente && existente.qrCode && existente.idTransacaoExterna) {
    return {
      sucesso: true,
      idTransacaoExterna: existente.idTransacaoExterna,
      qrCode: existente.qrCode,
      qrCodeImagemUrl: existente.qrCodeImagemUrl,
      expiraEm: existente.expiraEm.toISOString(),
    };
  }

  const valor = valorDoSelo(selo);
  const resultado = await cobrancaSeloService().criarCobrancaPix({
    pessoaId: sessao.pessoaId,
    selo,
    valor,
    referenciaMes,
  });
  if (!resultado.sucesso) {
    return { erro: `Não foi possível gerar o PIX agora: ${resultado.erro}` };
  }

  await prisma.cobrancaSelo.create({
    data: {
      pessoaId: sessao.pessoaId,
      selo,
      valor,
      referenciaMes,
      idTransacaoExterna: resultado.idTransacaoExterna,
      qrCode: resultado.qrCode,
      qrCodeImagemUrl: resultado.qrCodeImagemUrl,
      expiraEm: resultado.expiraEm,
    },
  });

  return {
    sucesso: true,
    idTransacaoExterna: resultado.idTransacaoExterna,
    qrCode: resultado.qrCode,
    qrCodeImagemUrl: resultado.qrCodeImagemUrl,
    expiraEm: resultado.expiraEm.toISOString(),
  };
}
