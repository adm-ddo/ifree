import { NextResponse } from "next/server";
import { finalizarTransferenciaAsaas } from "@/lib/pagamentos/asaas-status";
import { compararSeguro } from "@/lib/crypto";

/** Recebe a confirmação de verdade (concluiu ou falhou) de uma
 * transferência PIX enviada pra um extra — diferente do webhook de
 * AUTORIZAÇÃO (src/app/api/webhooks/asaas/autorizacao/route.ts, que só
 * decide se a transferência pode SEGUIR em frente); este aqui é
 * configurado na seção normal de "Webhooks" do painel Asaas (não em
 * "Mecanismos de segurança"), assinado nos eventos TRANSFER_* — formato
 * de payload confirmado na documentação pública
 * (docs.asaas.com/docs/webhook-para-transferencias):
 * `{ id, event, dateCreated, account, transfer: { id, status, value,
 * failReason, ... } }`. Ainda não testado contra uma chamada de verdade —
 * falta cadastrar essa URL no painel (ver comentário no fim do arquivo).
 *
 * A Asaas garante só "at least once" (pode reenviar o mesmo evento) — daí
 * finalizarTransferenciaAsaas ser idempotente (só mexe em Pagamento ainda
 * PROCESSANDO).
 *
 * Autenticação: header `asaas-access-token` comparado contra
 * ASAAS_WEBHOOK_TRANSFERENCIA_TOKEN — token DIFERENTE do webhook de
 * autorização de propósito (finalidades diferentes, raio de exposição
 * separado). Sem a env var configurada, recusa tudo (fail-closed), mesmo
 * padrão dos outros webhooks do projeto. */
export async function POST(req: Request) {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TRANSFERENCIA_TOKEN;
  if (!tokenEsperado) {
    return new NextResponse("Webhook não configurado.", { status: 401 });
  }

  const tokenRecebido = req.headers.get("asaas-access-token");
  if (!tokenRecebido || !compararSeguro(tokenRecebido, tokenEsperado)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const evento = String(payload?.event ?? "");
  const transferId = payload?.transfer?.id;

  if (!evento.startsWith("TRANSFER_") || !transferId) {
    return NextResponse.json({ ok: false, motivo: "payload não reconhecido" });
  }

  const statusAsaas = String(payload.transfer.status ?? "");
  const failReason = payload.transfer.failReason ?? null;

  await finalizarTransferenciaAsaas(String(transferId), statusAsaas, failReason);

  return NextResponse.json({ ok: true });
}

// Configuração no painel Asaas (Menu do usuário > Integrações > Webhooks
// > Criar novo webhook), assim que chegarmos nessa etapa:
//   URL: https://ifree.app.br/api/webhooks/asaas/transferencia
//   Token de autenticação: ASAAS_WEBHOOK_TRANSFERENCIA_TOKEN
//   Eventos: TRANSFER_DONE, TRANSFER_FAILED, TRANSFER_CANCELLED (os outros
//   — CREATED/PENDING/IN_BANK_PROCESSING/BLOCKED — não mudam nada aqui,
//   não precisam estar marcados, mas marcar também não tem problema:
//   finalizarTransferenciaAsaas ignora status que não são terminais).
