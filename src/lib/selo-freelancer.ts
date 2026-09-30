import "server-only";
import { prisma } from "@/lib/prisma";
import type { SeloFreelancer } from "@/generated/prisma/enums";

/** Mensalidade do selo Prata — libera currículo em PDF + alerta por e-mail
 * de vaga compatível (ver gates em src/app/portal/curriculo/pdf/route.ts e
 * src/lib/match-passivo.ts). */
export const VALOR_SELO_PRATA = 9.9;

/** Mensalidade do selo Ouro — tudo do Prata + destaque visual/filtro pras
 * empresas (fases seguintes, ainda não implementadas). */
export const VALOR_SELO_OURO = 19.9;

export function valorDoSelo(selo: Extract<SeloFreelancer, "PRATA" | "OURO">): number {
  return selo === "PRATA" ? VALOR_SELO_PRATA : VALOR_SELO_OURO;
}

/** "2026-08" — mês de competência, mesmo formato de referenciaMesAtual em
 * src/lib/assinatura.ts. */
export function referenciaMesAtual(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

/** Confirma que uma cobrança de selo foi paga — chamada pelo webhook (ver
 * src/app/api/webhooks/asaas/mensalidade/route.ts, que tenta primeiro
 * confirmarCobrancaPaga de empresa e só cai aqui se não achar). Idempotente:
 * chamar de novo pra uma cobrança já PAGA não faz nada.
 *
 * Próximo vencimento é sempre o vencimento anterior + 1 mês (ciclo fixo,
 * mesma regra de confirmarCobrancaPaga em src/lib/assinatura.ts) — pessoa
 * sem seloVenceEm (primeira vez pagando) usa hoje como base. */
export async function confirmarCobrancaSeloPaga(
  idTransacaoExterna: string
): Promise<{ ok: boolean; motivo?: string }> {
  const cobranca = await prisma.cobrancaSelo.findFirst({
    where: { idTransacaoExterna },
  });
  if (!cobranca) return { ok: false, motivo: "cobrança de selo não encontrada" };
  if (cobranca.status === "PAGA") return { ok: true };

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: cobranca.pessoaId },
    select: { seloVenceEm: true },
  });
  const pagoEm = new Date();
  const proximoVencimento = new Date(pessoa.seloVenceEm ?? pagoEm);
  proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);

  await prisma.$transaction([
    prisma.cobrancaSelo.update({
      where: { id: cobranca.id },
      data: { status: "PAGA", pagoEm },
    }),
    prisma.pessoa.update({
      where: { id: cobranca.pessoaId },
      data: { selo: cobranca.selo, seloVenceEm: proximoVencimento },
    }),
  ]);

  return { ok: true };
}

/** Roda no cron diário (ver src/app/api/cron/verificar-assinaturas) — volta
 * pra BRONZE toda pessoa com selo pago cujo vencimento já passou. Sem
 * período de graça (diferente da empresa): perder currículo/alerta por
 * e-mail não é bloquear acesso ao painel, não há razão pra segurar o
 * downgrade. Idempotente. */
export async function verificarSeloAtrasado(): Promise<{ rebaixadas: number }> {
  const resultado = await prisma.pessoa.updateMany({
    where: {
      selo: { in: ["PRATA", "OURO"] },
      seloVenceEm: { lt: new Date() },
    },
    data: { selo: "BRONZE" },
  });
  return { rebaixadas: resultado.count };
}
