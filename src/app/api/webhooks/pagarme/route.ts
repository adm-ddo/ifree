import { NextResponse } from "next/server";
import { confirmarCobrancaPaga } from "@/lib/assinatura";
import { compararSeguro } from "@/lib/crypto";

/** Recebe a confirmação de pagamento da Pagar.me pra liberar a assinatura
 * na hora. Formato do payload escrito a partir da documentação pública
 * (v5) — ainda não testado contra um webhook de verdade; primeira coisa a
 * validar assim que a Pagar.me estiver configurada (ver
 * PagarmeCobrancaService).
 *
 * Autenticação via HTTP Basic configurado na própria URL do webhook, no
 * painel da Pagar.me (`https://.../api/webhooks/pagarme` com usuário/senha
 * embutidos na URL, ex.: `https://usuario:senha@ifree.app.br/...`) —
 * comparado contra PAGARME_WEBHOOK_USER/PAGARME_WEBHOOK_SENHA. Sem essas
 * duas env vars configuradas, a rota recusa TUDO (fail-closed) — não tem
 * porque aceitar POST não autenticado só porque ainda estamos no modo mock
 * (que nunca precisa desta rota; confirmação de pagamento mock é feita
 * direto no banco durante teste, não por aqui). */
export async function POST(req: Request) {
  const usuarioEsperado = process.env.PAGARME_WEBHOOK_USER;
  if (!usuarioEsperado) {
    return new NextResponse("Webhook não configurado.", { status: 401 });
  }

  const auth = req.headers.get("authorization");
  const esperado = `Basic ${Buffer.from(
    `${usuarioEsperado}:${process.env.PAGARME_WEBHOOK_SENHA ?? ""}`
  ).toString("base64")}`;
  if (!auth || !compararSeguro(auth, esperado)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false, motivo: "payload inválido" });

  const tipo = String(payload.type ?? "");
  const dados = payload.data ?? {};
  const idCobranca = dados.id ?? dados.charges?.[0]?.id;
  const status = dados.status ?? dados.charges?.[0]?.status;

  if (!idCobranca) {
    return NextResponse.json({ ok: false, motivo: "payload sem id de cobrança" });
  }

  const pago = tipo.includes("paid") || status === "paid";
  if (!pago) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const resultado = await confirmarCobrancaPaga(String(idCobranca));
  return NextResponse.json(resultado);
}
