import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compararSeguro } from "@/lib/crypto";

/** Autoriza (ou recusa) transferências PIX pendentes na Asaas — substitui a
 * confirmação por Token SMS que a Asaas exige por padrão em toda
 * transferência de saída, e que travaria qualquer automação (confirmado
 * testando de verdade contra o sandbox: POST /v3/transfers respondeu
 * `status: "PENDING", authorized: false` — o dinheiro sai do saldo
 * disponível mas a transferência não completa sozinha).
 *
 * Configurado uma ÚNICA VEZ na CONTA-MÃE (painel Asaas: Menu do usuário >
 * Integrações > Mecanismos de segurança — URL desta rota + este token) —
 * vale automaticamente pra todas as subcontas, não precisa configurar por
 * empresa. Documentado em
 * https://docs.asaas.com/docs/mecanismo-para-validacao-de-saque-via-webhooks,
 * mas ainda NÃO testado contra uma chamada de verdade da Asaas (só
 * verificamos até aqui que o POST /v3/transfers fica pendente — ainda não
 * configuramos esse mecanismo no painel pra ver o webhook chegando de
 * verdade). Primeira coisa a validar assim que estiver configurado.
 *
 * Autenticação: header `asaas-access-token` comparado contra
 * ASAAS_WEBHOOK_AUTORIZACAO_TOKEN — sem essa env var configurada, recusa
 * tudo (fail-closed), mesmo padrão do webhook da Pagar.me
 * (src/app/api/webhooks/pagarme/route.ts).
 *
 * Lógica de autorização: só aprova uma transferência que TEMOS registrada
 * como iniciada por nós (Pagamento.idTransacaoExterna === transfer.id) —
 * nunca aprova cegamente só porque a Asaas perguntou. Isso também é a
 * defesa contra o pior cenário (alguém descobrir a URL e o token): mesmo
 * assim só consegue aprovar transferências que já existem no nosso banco.
 *
 * RISCO CONHECIDO, AINDA NÃO VALIDADO: existe uma corrida possível entre
 * o POST /v3/transfers retornar (nosso código ainda não terminou de
 * gravar idTransacaoExterna no Pagamento) e a Asaas já chamar este webhook
 * perguntando se autoriza. Se isso acontecer na prática, a resposta abaixo
 * seria REFUSED por engano. Precisa ser testado de verdade antes de confiar
 * nisso em produção — possível mitigação: reconferir depois de um pequeno
 * atraso antes de recusar, em vez de recusar na primeira tentativa. */
export async function POST(req: Request) {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_AUTORIZACAO_TOKEN;
  if (!tokenEsperado) {
    return new NextResponse("Webhook não configurado.", { status: 401 });
  }

  const tokenRecebido = req.headers.get("asaas-access-token");
  if (!tokenRecebido || !compararSeguro(tokenRecebido, tokenEsperado)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || payload.type !== "TRANSFER" || !payload.transfer?.id) {
    // Tipos que não são TRANSFER (BILL, PIX_QR_CODE, MOBILE_PHONE_RECHARGE,
    // PIX_REFUND) não existem no nosso fluxo — recusa por segurança em vez
    // de aprovar algo que não reconhecemos.
    return NextResponse.json({ status: "REFUSED", refuseReason: "Operação não reconhecida pelo iFREE." });
  }

  const pagamento = await prisma.pagamento.findFirst({
    where: { idTransacaoExterna: String(payload.transfer.id) },
  });

  if (!pagamento) {
    return NextResponse.json({
      status: "REFUSED",
      refuseReason: "Transferência não encontrada nos registros do iFREE.",
    });
  }

  return NextResponse.json({ status: "APPROVED" });
}
