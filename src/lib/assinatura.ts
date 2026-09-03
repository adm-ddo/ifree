import "server-only";
import { prisma } from "@/lib/prisma";

/** Dias de teste grátis pra empresa nova — ver cadastrarNovaEmpresa em
 * src/app/empresas/actions.ts. Só constante em código de propósito, fácil
 * de ajustar sem migração. */
export const TRIAL_DIAS = 14;

/** Valor padrão da mensalidade quando a empresa não tem um valor próprio
 * combinado (Empresa.valorMensalidade null) — ajustável por empresa em
 * /master/assinaturas. */
export const VALOR_MENSALIDADE_PADRAO = 99.9;

export function valorMensalidadeEfetivo(valorMensalidade: number | null): number {
  return valorMensalidade ?? VALOR_MENSALIDADE_PADRAO;
}

/** "2026-08" — mês de competência da cobrança, no fuso de Brasília, no
 * mesmo formato en-CA usado em src/lib/data.ts (dataISOBrasil). */
export function referenciaMesAtual(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

/** Confirma que uma cobrança foi paga — chamada pelo webhook da Pagar.me
 * (ver src/app/api/webhooks/pagarme/route.ts). Idempotente: chamar de novo
 * pra uma cobrança já PAGA não faz nada (o provedor pode reenviar o mesmo
 * evento mais de uma vez). Marca a empresa como ATIVA com vencimento 1 mês
 * a partir de agora — nunca a partir do vencimento anterior, pra não
 * acumular atraso se o pagamento veio depois do prazo. */
export async function confirmarCobrancaPaga(
  idTransacaoExterna: string
): Promise<{ ok: boolean; motivo?: string }> {
  const cobranca = await prisma.cobrancaMensalidade.findFirst({
    where: { idTransacaoExterna },
  });
  if (!cobranca) return { ok: false, motivo: "cobrança não encontrada" };
  if (cobranca.status === "PAGA") return { ok: true };

  const pagoEm = new Date();
  const proximoVencimento = new Date(pagoEm);
  proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);

  await prisma.$transaction([
    prisma.cobrancaMensalidade.update({
      where: { id: cobranca.id },
      data: { status: "PAGA", pagoEm },
    }),
    prisma.empresa.update({
      where: { id: cobranca.empresaId },
      data: { statusAssinatura: "ATIVA", assinaturaVenceEm: proximoVencimento },
    }),
  ]);

  return { ok: true };
}

/** Roda no cron diário (ver src/app/api/cron/verificar-assinaturas) —
 * marca ATRASADA toda empresa em TRIAL ou ATIVA cujo vencimento já passou.
 * Empresas sem assinaturaVenceEm (backfill de quem já era cliente antes
 * deste controle existir) nunca batem nesse filtro — ficam ATIVA pra
 * sempre até o master mexer manualmente. Idempotente: rodar de novo no
 * mesmo dia não muda nada além do que já mudou. */
export async function verificarAssinaturasAtrasadas(): Promise<{ marcadasAtrasadas: number }> {
  const resultado = await prisma.empresa.updateMany({
    where: {
      statusAssinatura: { in: ["TRIAL", "ATIVA"] },
      assinaturaVenceEm: { lt: new Date() },
    },
    data: { statusAssinatura: "ATRASADA" },
  });
  return { marcadasAtrasadas: resultado.count };
}
