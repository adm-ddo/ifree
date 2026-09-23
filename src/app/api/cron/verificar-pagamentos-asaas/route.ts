import { NextResponse } from "next/server";
import { verificarPagamentosAsaasPendentes } from "@/lib/pagamentos/verificar-pendentes-asaas";
import { expirarDepositosVencidos } from "@/lib/pagamentos/asaas-deposito";

/** Chamada pelo Vercel Cron (ver vercel.json) — rede de segurança pro
 * webhook de status de transferência (src/app/api/webhooks/asaas/
 * transferencia/route.ts) que não chegou. Mesma checagem de segredo dos
 * outros crons do projeto. Sem nenhuma empresa conectada na Asaas ainda
 * (ContaAsaasEmpresa vazia), roda e não faz nada — seguro deixar ativo
 * mesmo antes da automação estar ligada de verdade.
 *
 * Também aproveita a mesma janela (2x/dia) pra expirar depósitos PIX
 * vencidos (ver expirarDepositosVencidos) — cobre quem não visita a tela
 * de Pagamentos depois que o PIX vence (lá o mesmo ajuste já roda ao vivo
 * a cada visita, escopado só na empresa; aqui roda global, sem
 * empresaId). Conceito diferente do resto do arquivo (depósito = crédito
 * ENTRANDO na subconta, não transferência SAINDO pros extras), mas
 * mesmo espírito de "nada fica preso pra sempre sem ninguém perceber" e
 * mesma cadência já configurada — não vale a pena um cron novo só pra
 * isso. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [resultado, depositosExpirados] = await Promise.all([
    verificarPagamentosAsaasPendentes(),
    expirarDepositosVencidos(),
  ]);
  return NextResponse.json({ ok: true, ...resultado, depositosExpirados });
}
