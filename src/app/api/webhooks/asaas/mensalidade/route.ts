import { NextResponse } from "next/server";
import { confirmarCobrancaPaga } from "@/lib/assinatura";
import { confirmarCobrancaSeloPaga } from "@/lib/selo-freelancer";
import { compararSeguro } from "@/lib/crypto";

/** Recebe a confirmação de que uma empresa cliente pagou a MENSALIDADE do
 * iFREE (ver AsaasCobrancaService em src/lib/cobranca/) — diferente dos
 * outros webhooks Asaas do projeto: esses aí são todos sobre dinheiro dos
 * EXTRAS (subconta por empresa); este aqui é sobre o dinheiro do próprio
 * iFREE, cobrado pela conta-mãe. Por isso precisa ser registrado
 * diretamente na conta-mãe (Configurações > Integrações > Webhooks, dentro
 * do próprio painel Asaas — não dá pra automatizar como as subcontas,
 * que se cria via API; a conta-mãe é uma só e configurada manualmente uma
 * única vez), eventos PAYMENT_RECEIVED e PAYMENT_CONFIRMED.
 *
 * MESMO endpoint também confirma cobrança do SELO do freelancer (ver
 * AsaasCobrancaSeloService em src/lib/cobranca-selo/) — as duas cobram da
 * mesma conta-mãe, então reaproveita o único webhook já cadastrado em vez
 * de precisar registrar um segundo na Asaas: tenta confirmarCobrancaPaga
 * (empresa) primeiro, e só tenta confirmarCobrancaSeloPaga (pessoa) se a
 * primeira não achar a cobrança por esse paymentId.
 *
 * Autenticação: header `asaas-access-token` comparado contra
 * ASAAS_WEBHOOK_MENSALIDADE_TOKEN — token PRÓPRIO, isolado dos outros.
 * Sem a env var, recusa tudo (fail-closed). */
export async function POST(req: Request) {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_MENSALIDADE_TOKEN;
  if (!tokenEsperado) {
    return new NextResponse("Webhook não configurado.", { status: 401 });
  }

  const tokenRecebido = req.headers.get("asaas-access-token");
  if (!tokenRecebido || !compararSeguro(tokenRecebido, tokenEsperado)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const evento = String(payload?.event ?? "");
  const paymentId = payload?.payment?.id;

  if (!evento.startsWith("PAYMENT_") || !paymentId) {
    return NextResponse.json({ ok: false, motivo: "payload não reconhecido" });
  }

  if (evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED") {
    const resultado = await confirmarCobrancaPaga(String(paymentId));
    if (!resultado.ok) {
      await confirmarCobrancaSeloPaga(String(paymentId));
    }
  }

  return NextResponse.json({ ok: true });
}
