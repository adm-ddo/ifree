import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compararSeguro } from "@/lib/crypto";

/** Recebe a confirmação de que a empresa pagou o PIX de depósito (crédito
 * pra pagar os extras — ver src/lib/pagamentos/asaas-deposito.ts).
 * Registrado na mesma subconta que o webhook de transferência (ver
 * conectarContaAsaas em src/app/configuracoes/actions.ts), mas nos
 * eventos PAYMENT_RECEIVED/PAYMENT_CONFIRMED — payload confirmado contra
 * a documentação pública no mesmo formato do webhook de transferência:
 * `{ id, event, dateCreated, account, payment: { id, status, value, ... } }`.
 *
 * PIX é instantâneo — na prática só PAYMENT_RECEIVED deveria disparar
 * pra esse meio de pagamento, mas escuta os dois por segurança (o dinheiro
 * já está lá em qualquer um dos dois).
 *
 * Autenticação: header `asaas-access-token` comparado contra
 * ASAAS_WEBHOOK_DEPOSITO_TOKEN — token PRÓPRIO, diferente dos outros dois
 * webhooks (autorização e status de transferência), mesmo espírito de
 * isolar o raio de exposição de cada um. Sem a env var, recusa tudo
 * (fail-closed). */
export async function POST(req: Request) {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_DEPOSITO_TOKEN;
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
    // updateMany (não update) de propósito: idempotente contra reenvio do
    // mesmo evento ("at least once" da Asaas) e contra o caso raro de
    // PAYMENT_RECEIVED e PAYMENT_CONFIRMED chegarem os dois — a condição
    // `status: "PENDENTE"` garante que só a primeira confirmação conta.
    await prisma.depositoAsaas.updateMany({
      where: { idCobrancaExterna: String(paymentId), status: "PENDENTE" },
      data: { status: "RECEBIDO", recebidoEm: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
