import "server-only";
import { prisma } from "@/lib/prisma";

/** Quanto tempo em PROCESSANDO sem nenhuma confirmação (nem do webhook, nem
 * do cron de conferência) até desistir de esperar e marcar como falha pra
 * alguém olhar na mão — nunca deixar um pagamento preso "processando" pra
 * sempre sem ninguém saber. Generoso de propósito (o cron de conferência
 * roda só 1-2x por dia, não a cada minuto — ver vercel.json), então esse
 * limite precisa ser maior que o intervalo entre execuções do cron. */
export const LIMITE_PROCESSANDO_HORAS = 24;

/** Atualiza Pagamento/Turno a partir do status real de uma transferência na
 * Asaas — chamada tanto pelo webhook de status
 * (src/app/api/webhooks/asaas/transferencia/route.ts, tempo real) quanto
 * pelo cron de conferência (src/app/api/cron/verificar-pagamentos-asaas,
 * rede de segurança pro caso do webhook não chegar). As duas fontes
 * chamam essa mesma função de propósito — uma única regra de negócio, dois
 * jeitos de disparar.
 *
 * Idempotente por construção: só mexe em Pagamento que ainda está
 * PROCESSANDO — uma segunda notificação do mesmo evento (a Asaas garante
 * "at least once", pode duplicar) ou uma corrida entre webhook e cron
 * batendo quase ao mesmo tempo não faz mal, a segunda chamada só encontra
 * o registro já resolvido e não faz nada. */
export async function finalizarTransferenciaAsaas(
  idTransacaoExterna: string,
  statusAsaas: string,
  failReason: string | null
): Promise<void> {
  const pagamento = await prisma.pagamento.findFirst({
    where: { idTransacaoExterna, status: "PROCESSANDO" },
  });
  if (!pagamento) return;

  if (statusAsaas === "DONE") {
    await prisma.$transaction([
      prisma.pagamento.update({
        where: { id: pagamento.id },
        data: { status: "CONCLUIDO", processadoEm: new Date(), erro: null },
      }),
      prisma.turno.update({ where: { id: pagamento.turnoId }, data: { status: "PAGO" } }),
    ]);
    return;
  }

  if (statusAsaas === "FAILED" || statusAsaas === "CANCELLED") {
    await prisma.$transaction([
      prisma.pagamento.update({
        where: { id: pagamento.id },
        data: { status: "FALHOU", erro: failReason ?? `Transferência ${statusAsaas.toLowerCase()} na Asaas.` },
      }),
      prisma.turno.update({ where: { id: pagamento.turnoId }, data: { status: "ERRO_PAGAMENTO" } }),
    ]);
    return;
  }

  // PENDING / IN_BANK_PROCESSING / BLOCKED / qualquer outro — ainda em
  // andamento de verdade, não é nem sucesso nem falha ainda. Não mexe em
  // nada; o cron de conferência decide separadamente (ver
  // verificarPagamentosAsaasPendentes) se já passou tempo demais nesse
  // estado e precisa desistir.
}
