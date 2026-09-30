import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/// Configurado uma vez, no import do módulo — as 3 env vars são geradas
/// por webpush.generateVAPIDKeys() (script descartável, rodado uma
/// única vez) e cadastradas como secret (nunca comitadas). Sem elas
/// configuradas (ambiente sem push ainda), enviarPushPessoa falha alto e
/// quem chama decide o que fazer — não silencia o erro aqui, porque
/// nesse caso é uma falha de configuração, não "a pessoa não tem
/// notificação ativada" (que é um caso esperado, tratado à parte).
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/// Mínimo de horas entre dois cliques em "Chamar atenção" pra mesma
/// conversa — ver chamarAtencaoConversa em src/app/conversas/[id]/actions.ts.
/// Existe pra nunca virar spam de notificação push no celular do
/// freelancer.
export const CHAMAR_ATENCAO_INTERVALO_HORAS = 4;

export type PayloadPush = { title: string; body: string; url?: string };

/** Manda uma notificação push pra TODAS as subscriptions ativas dessa
 * Pessoa (pode ter mais de um dispositivo/navegador com notificação
 * ativada) — em paralelo, mesmo espírito de processarEmLotes
 * (src/lib/lote.ts), só que aqui o total por pessoa é sempre pequeno
 * (poucos dispositivos), então não precisa de lote/concorrência
 * limitada. Uma subscription que o provedor (FCM/Mozilla/etc.) devolve
 * como expirada (410 Gone, ou 404 se o endpoint nem existe mais) é
 * apagada do banco na hora — não faz sentido tentar de novo depois, o
 * navegador teria que gerar uma subscription nova. */
export async function enviarPushPessoa(
  pessoaId: number,
  payload: PayloadPush
): Promise<{ enviados: number; total: number }> {
  const subscriptions = await prisma.pushSubscriptionPessoa.findMany({ where: { pessoaId } });
  if (subscriptions.length === 0) return { enviados: 0, total: 0 };

  const resultados = await Promise.allSettled(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.chaveP256dh, auth: s.chaveAuth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscriptionPessoa.delete({ where: { id: s.id } }).catch(() => {});
        }
        throw err;
      }
    })
  );

  return {
    enviados: resultados.filter((r) => r.status === "fulfilled").length,
    total: subscriptions.length,
  };
}
