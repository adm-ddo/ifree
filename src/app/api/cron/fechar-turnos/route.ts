import { NextResponse } from "next/server";
import { fecharTurnosAtrasados, sinalizarRegistrosPontoPendentes } from "@/lib/fechamento-automatico";
import { executarBackup } from "@/lib/backup";

/** Chamada pelo Vercel Cron (ver vercel.json) DUAS vezes por dia — 01:00 e
 * 07:00 de Brasília. A segunda chamada é rede de segurança: se a das 01:00
 * falhar por qualquer motivo (deploy em andamento, erro transiente), a das
 * 07:00 pega o que sobrou — a função é idempotente (só fecha turno que
 * ainda está ABERTO com entrada antes de hoje), então rodar duas vezes no
 * mesmo dia não tem efeito colateral quando a primeira já deu conta.
 * Mesma checagem de segredo do cron de backup.
 *
 * Também dispara um backup a cada chamada — além do backup diário de
 * madrugada (/api/cron/backup), assim fica um snapshot batido bem na hora
 * em que os turnos se encerram. Falha no backup não derruba o fechamento
 * dos turnos (já é o resultado principal dessa rota); só fica registrada
 * na resposta. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await fecharTurnosAtrasados();
  const pontoClt = await sinalizarRegistrosPontoPendentes();

  let backup: { caminho: string; tamanhoBytes: number } | { erro: string };
  try {
    backup = await executarBackup();
  } catch (err) {
    backup = { erro: err instanceof Error ? err.message : "Erro desconhecido no backup." };
  }

  return NextResponse.json({ ok: true, ...resultado, ...pontoClt, backup });
}
