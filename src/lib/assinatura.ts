import "server-only";
import { prisma } from "@/lib/prisma";
import type { StatusAssinatura } from "@/generated/prisma/enums";

/** Dias de teste grátis pra empresa nova — ver cadastrarNovaEmpresa em
 * src/app/empresas/actions.ts. Só constante em código de propósito, fácil
 * de ajustar sem migração. Master pode estender manualmente pra qualquer
 * empresa específica via assinaturaVenceEm em /master/assinaturas.
 * Subiu de 7 pra 14 dias em 2026-09-24 (decisão do Thiago, alinhado com o
 * card comercial de planos). */
export const TRIAL_DIAS = 14;

/** Tolerância depois do vencimento antes de bloquear o painel de verdade
 * (ver verificarAssinaturasAtrasadas abaixo) — decisão do Thiago em
 * 2026-09-08: dá uma folga curta em vez de cortar na hora exata do
 * vencimento. */
export const GRACA_DIAS = 2;

/** Opções que o dono da empresa pode escolher em /configuracoes pra
 * quantos dias antes do vencimento o aviso de renovação
 * (AlertaAssinaturaVencendo, ver src/app/layout.tsx) começa a aparecer —
 * ver Empresa.avisoVencimentoDias no schema. */
export const AVISO_VENCIMENTO_OPCOES = [1, 3, 7] as const;

/// Duração da janela da liberação de confiança (1x por mês por empresa,
/// ver solicitarLiberacaoConfianca em src/app/assinatura/actions.ts).
export const LIBERACAO_CONFIANCA_HORAS = 24;

/** Quando a liberação de confiança volta a ficar disponível (1 mês depois
 * do último uso) — null se nunca foi usada (já pode usar). */
export function proximaLiberacaoConfiancaEm(usadaEm: Date | null): Date | null {
  if (!usadaEm) return null;
  const proxima = new Date(usadaEm);
  proxima.setMonth(proxima.getMonth() + 1);
  return proxima;
}

export function podeUsarLiberacaoConfianca(usadaEm: Date | null, agora: Date = new Date()): boolean {
  const proxima = proximaLiberacaoConfiancaEm(usadaEm);
  return proxima === null || proxima <= agora;
}

/** Valor padrão da mensalidade quando a empresa não tem um valor próprio
 * combinado (Empresa.valorMensalidade null) — ajustável por empresa em
 * /master/assinaturas. */
export const VALOR_MENSALIDADE_PADRAO = 99.9;

export function valorMensalidadeEfetivo(valorMensalidade: number | null): number {
  return valorMensalidade ?? VALOR_MENSALIDADE_PADRAO;
}

/** MRR em dois números separados — nunca misturados num só, pra não
 * confundir receita confirmada com previsão (decisão do Thiago em
 * 2026-09-24, discutindo o dashboard de clientes de /master/assinaturas):
 * `real` é exatamente o cálculo que já existia (só empresas ATIVA, pagando
 * em dia), `potencial` soma também quem está em TRIAL — cenário "se todo
 * trial virasse pagante". ATRASADA/CANCELADA ficam de fora dos dois (mesma
 * regra de sempre pra ATRASADA: não é receita disponível agora). */
export function calcularMrr(
  empresas: { statusAssinatura: StatusAssinatura; valorMensalidade: number | null }[]
): { real: number; potencial: number } {
  const somaPorStatus = (status: StatusAssinatura) =>
    empresas
      .filter((e) => e.statusAssinatura === status)
      .reduce((soma, e) => soma + valorMensalidadeEfetivo(e.valorMensalidade), 0);

  const real = somaPorStatus("ATIVA");
  const potencial = real + somaPorStatus("TRIAL");
  return { real, potencial };
}

/** Máximo de parcelas pro tablet fornecido (12x sem juros) — ver
 * Empresa.tabletParcelasTotal no schema. */
export const TABLET_PARCELAS_MAXIMO = 12;

/** Quanto falta cobrar do tablet nesta cobrança (null se não tem tablet
 * ativo, ou já quitado) — parcelas iguais, arredondadas pro centavo mais
 * próximo (ver comentário completo em Empresa.tabletValorTotal no
 * schema: valor baixo, não justifica lidar com resto de divisão numa
 * última parcela ajustada). */
export function valorParcelaTabletPendente(empresa: {
  tabletFornecido: boolean;
  tabletValorTotal: number | null;
  tabletParcelasTotal: number | null;
  tabletParcelasPagas: number;
}): number | null {
  if (!empresa.tabletFornecido) return null;
  if (empresa.tabletValorTotal === null || empresa.tabletParcelasTotal === null) return null;
  if (empresa.tabletParcelasPagas >= empresa.tabletParcelasTotal) return null;
  return Math.round((empresa.tabletValorTotal / empresa.tabletParcelasTotal) * 100) / 100;
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

/** Confirma que uma cobrança foi paga — chamada pelo webhook da Asaas (ver
 * src/app/api/webhooks/asaas/mensalidade/route.ts). Idempotente: chamar de
 * novo pra uma cobrança já PAGA não faz nada (o provedor pode reenviar o
 * mesmo evento mais de uma vez).
 *
 * O próximo vencimento é SEMPRE o vencimento anterior + 1 mês (ciclo fixo,
 * "ancorado" na data de cadastro/primeiro vencimento) — decisão do Thiago
 * em 2026-09-08, igual fatura de cartão de crédito: a data não flutua
 * conforme quando o pagamento realmente cai. Pagar atrasado não estica o
 * próximo ciclo, só encurta o período que sobra até o vencimento seguinte
 * (que continua caindo no mesmo "dia do mês" de sempre). Empresa sem
 * assinaturaVenceEm (backfill antigo) usa hoje como base, já que não tem
 * ciclo anterior pra ancorar. */
export async function confirmarCobrancaPaga(
  idTransacaoExterna: string
): Promise<{ ok: boolean; motivo?: string }> {
  const cobranca = await prisma.cobrancaMensalidade.findFirst({
    where: { idTransacaoExterna },
  });
  if (!cobranca) return { ok: false, motivo: "cobrança não encontrada" };
  if (cobranca.status === "PAGA") return { ok: true };

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: cobranca.empresaId },
    select: { assinaturaVenceEm: true },
  });
  const pagoEm = new Date();
  const proximoVencimento = new Date(empresa.assinaturaVenceEm ?? pagoEm);
  proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);

  await prisma.$transaction([
    prisma.cobrancaMensalidade.update({
      where: { id: cobranca.id },
      data: { status: "PAGA", pagoEm },
    }),
    prisma.empresa.update({
      where: { id: cobranca.empresaId },
      data: {
        statusAssinatura: "ATIVA",
        assinaturaVenceEm: proximoVencimento,
        // Só anda o contador de parcelas do tablet quando o Pix desta
        // cobrança específica REALMENTE incluía uma parcela dele (ver
        // valorTablet no schema) — nunca na geração, só na confirmação.
        ...(cobranca.valorTablet !== null ? { tabletParcelasPagas: { increment: 1 } } : {}),
      },
    }),
  ]);

  return { ok: true };
}

/** Roda no cron diário (ver src/app/api/cron/verificar-assinaturas) —
 * marca ATRASADA toda empresa em TRIAL ou ATIVA cujo vencimento já passou
 * há mais de GRACA_DIAS (folga antes do bloqueio de verdade). Empresas sem
 * assinaturaVenceEm (backfill de quem já era cliente antes deste controle
 * existir) nunca batem nesse filtro — ficam ATIVA pra sempre até o master
 * mexer manualmente. Idempotente: rodar de novo no mesmo dia não muda nada
 * além do que já mudou. */
export async function verificarAssinaturasAtrasadas(): Promise<{ marcadasAtrasadas: number }> {
  const limite = new Date();
  limite.setDate(limite.getDate() - GRACA_DIAS);
  const resultado = await prisma.empresa.updateMany({
    where: {
      statusAssinatura: { in: ["TRIAL", "ATIVA"] },
      assinaturaVenceEm: { lt: limite },
    },
    data: { statusAssinatura: "ATRASADA" },
  });
  return { marcadasAtrasadas: resultado.count };
}

/** Dias até o vencimento (negativo = já venceu) — base do aviso proativo
 * de renovação (AlertaAssinaturaVencendo) e de qualquer outra tela que
 * precise dessa contagem. Arredonda pra cima (Math.ceil) pra "vence daqui a
 * pouco mais de 4 dias" já contar como "5 dias", sinalizando cedo. */
export function diasParaVencer(assinaturaVenceEm: Date, agora: Date = new Date()): number {
  return Math.ceil((assinaturaVenceEm.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000));
}
