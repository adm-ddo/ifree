import "server-only";
import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/crypto";
import { finalizarTransferenciaAsaas, LIMITE_PROCESSANDO_HORAS } from "./asaas-status";

/// https://docs.asaas.com — sandbox por padrão até a conta de produção do
/// iFREE estar aprovada; trocar pra "https://api.asaas.com/v3" só quando
/// migrar pra produção (nunca ligado a NODE_ENV — o app pode estar rodando
/// em produção na Vercel ainda testando contra o sandbox da Asaas).
function baseUrlAsaas(): string {
  return process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";
}

/** Rede de segurança pro webhook de status que não chegou (Asaas fora do
 * ar, erro de rede, webhook mal configurado etc.) — chamada pelo cron
 * (src/app/api/cron/verificar-pagamentos-asaas/route.ts), roda só 1-2x por
 * dia (ver vercel.json), então NÃO é o caminho normal de confirmação (isso
 * é o webhook, em tempo real) — é só a garantia de que nenhum pagamento
 * fica preso pra sempre sem ninguém perceber.
 *
 * Pra cada Pagamento ainda PROCESSANDO com id de transferência Asaas,
 * consulta o status real na Asaas (GET /v3/transfers/{id}, autenticado com
 * a apiKey da SUBCONTA daquela empresa — não a mestra) e resolve pelo
 * mesmo caminho do webhook (finalizarTransferenciaAsaas, idempotente).
 * Depois de LIMITE_PROCESSANDO_HORAS sem resolução nenhuma (nem aqui nem
 * pelo webhook), desiste e marca como falha pra alguém olhar na mão — ver
 * o comentário de LIMITE_PROCESSANDO_HORAS pro raciocínio do valor. */
export async function verificarPagamentosAsaasPendentes(): Promise<{
  verificados: number;
  resolvidos: number;
  desistidos: number;
  erros: number;
}> {
  const pendentes = await prisma.pagamento.findMany({
    where: { status: "PROCESSANDO", idTransacaoExterna: { not: null } },
    include: {
      turno: { select: { empresa: { select: { contaAsaas: true } } } },
    },
  });

  let resolvidos = 0;
  let erros = 0;

  for (const pagamento of pendentes) {
    const contaAsaas = pagamento.turno.empresa.contaAsaas;
    if (!contaAsaas || !pagamento.idTransacaoExterna) continue; // não é um pagamento via Asaas, nada a conferir aqui

    try {
      const resposta = await fetch(`${baseUrlAsaas()}/transfers/${pagamento.idTransacaoExterna}`, {
        headers: { access_token: descriptografar(contaAsaas.apiKeyCriptografada) },
      });
      if (!resposta.ok) {
        erros++;
        continue;
      }
      const dados = await resposta.json();
      const statusAntes = pagamento.status;
      await finalizarTransferenciaAsaas(pagamento.idTransacaoExterna, dados.status, dados.failReason ?? null);
      // finalizarTransferenciaAsaas não devolve se resolveu ou não —
      // reconfere direto no banco pra contar certo no resultado do cron.
      const depois = await prisma.pagamento.findUnique({ where: { id: pagamento.id }, select: { status: true } });
      if (depois && depois.status !== statusAntes) resolvidos++;
    } catch {
      erros++;
    }
  }

  // Segunda passada: quem continua PROCESSANDO depois da conferência acima
  // (Asaas ainda não decidiu, ou a própria empresa nunca teve conta Asaas
  // — nesse caso nunca vai resolver sozinho) E já passou do limite de
  // espera, desiste e marca falha — nunca deixar visível como "processando"
  // pra sempre sem ninguém saber que precisa de atenção.
  const limite = new Date(Date.now() - LIMITE_PROCESSANDO_HORAS * 60 * 60 * 1000);
  const presos = await prisma.pagamento.findMany({
    where: { status: "PROCESSANDO", criadoEm: { lt: limite } },
    select: { id: true, turnoId: true },
  });
  for (const preso of presos) {
    await prisma.$transaction([
      prisma.pagamento.update({
        where: { id: preso.id },
        data: {
          status: "FALHOU",
          erro: `Sem confirmação da Asaas após ${LIMITE_PROCESSANDO_HORAS}h — verificar manualmente.`,
        },
      }),
      prisma.turno.update({ where: { id: preso.turnoId }, data: { status: "ERRO_PAGAMENTO" } }),
    ]);
  }

  return { verificados: pendentes.length, resolvidos, desistidos: presos.length, erros };
}
