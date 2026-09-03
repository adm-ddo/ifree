"use server";

import { prisma } from "@/lib/prisma";
import { requireSessao } from "@/lib/auth";
import { cobrancaService } from "@/lib/cobranca";
import { valorMensalidadeEfetivo, referenciaMesAtual } from "@/lib/assinatura";

export type GerarCobrancaState =
  | { erro: string }
  | { sucesso: true; qrCode: string; qrCodeImagemUrl: string | null; expiraEm: string }
  | undefined;

/** Gera (ou reaproveita, se já existir uma válida do mesmo mês) o PIX da
 * mensalidade — chamada pelo botão em /assinatura. Nunca confia no
 * empresaId vindo do cliente sem checar que a sessão realmente pertence a
 * essa empresa (mesmo cuidado de qualquer action escopada a tenant, só que
 * aqui não dá pra usar requireTenant — é o ponto de fuga do próprio
 * bloqueio que requireTenant aplica). Retorna { erro } em vez de lançar
 * exceção — chamada direto pelo client, mesmo motivo documentado em
 * src/app/freelancers/actions.ts::converterParaClt. */
export async function gerarCobrancaMensalidade(empresaId: number): Promise<GerarCobrancaState> {
  const sessao = await requireSessao();
  const pertence =
    sessao.isMaster || sessao.minhasEmpresas.some((e) => e.id === empresaId);
  if (!pertence) return { erro: "Essa empresa não pertence a este login." };

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { valorMensalidade: true },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  const referenciaMes = referenciaMesAtual();

  const existente = await prisma.cobrancaMensalidade.findFirst({
    where: {
      empresaId,
      referenciaMes,
      status: "PENDENTE",
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: "desc" },
  });
  if (existente && existente.qrCode) {
    return {
      sucesso: true,
      qrCode: existente.qrCode,
      qrCodeImagemUrl: existente.qrCodeImagemUrl,
      expiraEm: existente.expiraEm.toISOString(),
    };
  }

  const valor = valorMensalidadeEfetivo(
    empresa.valorMensalidade !== null ? Number(empresa.valorMensalidade) : null
  );

  const resultado = await cobrancaService().criarCobrancaPix({ empresaId, valor, referenciaMes });
  if (!resultado.sucesso) {
    return { erro: `Não foi possível gerar o PIX agora: ${resultado.erro}` };
  }

  await prisma.cobrancaMensalidade.create({
    data: {
      empresaId,
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
    qrCode: resultado.qrCode,
    qrCodeImagemUrl: resultado.qrCodeImagemUrl,
    expiraEm: resultado.expiraEm.toISOString(),
  };
}
