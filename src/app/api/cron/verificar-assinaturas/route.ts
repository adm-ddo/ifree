import { NextResponse } from "next/server";
import { verificarAssinaturasAtrasadas } from "@/lib/assinatura";

/** Chamada pelo Vercel Cron (ver vercel.json), 1x por dia — marca ATRASADA
 * toda empresa em TRIAL/ATIVA cujo vencimento já passou. Mesma checagem de
 * segredo dos outros crons (backup, fechar-turnos). */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await verificarAssinaturasAtrasadas();
  return NextResponse.json({ ok: true, ...resultado });
}
