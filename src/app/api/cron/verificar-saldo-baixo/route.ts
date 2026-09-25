import { NextResponse } from "next/server";
import { verificarAlertasSaldoBaixo } from "@/lib/pagamentos/asaas-deposito";

/** Chamada pelo Vercel Cron (ver vercel.json), 2x/dia — avisa por e-mail
 * quem tem o alerta de saldo baixo ligado (Empresa.alertaSaldoBaixoAtivo)
 * e está com o saldo Asaas abaixo do mínimo configurado, com texto
 * especial de fim de semana se hoje for sexta (ver
 * verificarAlertasSaldoBaixo em src/lib/pagamentos/asaas-deposito.ts pra
 * a regra completa). Mesma checagem de segredo dos outros crons do
 * projeto. Sem nenhuma empresa com o alerta ativo, roda e não faz nada —
 * seguro deixar ativo sempre. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await verificarAlertasSaldoBaixo();
  return NextResponse.json({ ok: true, ...resultado });
}
