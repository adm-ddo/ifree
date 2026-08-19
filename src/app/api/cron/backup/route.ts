import { NextResponse } from "next/server";
import { executarBackup } from "@/lib/backup";

/** Chamada pelo Vercel Cron (ver vercel.json). Vercel injeta o header
 * `Authorization: Bearer $CRON_SECRET` automaticamente nas chamadas de
 * cron — sem o segredo certo, qualquer um poderia acionar isso e gerar
 * backups à vontade. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await executarBackup();
  return NextResponse.json({ ok: true, ...resultado });
}
