import { NextResponse } from "next/server";
import { fecharTurnosAtrasados } from "@/lib/fechamento-automatico";
import { executarBackup } from "@/lib/backup";

/** Chamada pelo Vercel Cron (ver vercel.json), uma vez por dia às 01:00 de
 * Brasília. Mesma checagem de segredo do cron de backup.
 *
 * Também dispara um backup logo depois de fechar os turnos do dia — além
 * do backup diário de madrugada (/api/cron/backup), assim fica um
 * snapshot batido bem na hora em que os turnos se encerram. Falha no
 * backup não derruba o fechamento dos turnos (já é o resultado principal
 * dessa rota); só fica registrada na resposta. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await fecharTurnosAtrasados();

  let backup: { caminho: string; tamanhoBytes: number } | { erro: string };
  try {
    backup = await executarBackup();
  } catch (err) {
    backup = { erro: err instanceof Error ? err.message : "Erro desconhecido no backup." };
  }

  return NextResponse.json({ ok: true, ...resultado, backup });
}
