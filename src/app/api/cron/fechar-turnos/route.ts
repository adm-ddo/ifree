import { NextResponse } from "next/server";
import { fecharTurnosAtrasados, sinalizarRegistrosPontoPendentes } from "@/lib/fechamento-automatico";

/** Chamada pelo Vercel Cron (ver vercel.json) DUAS vezes por dia — 01:00 e
 * 07:00 de Brasília. A segunda chamada é rede de segurança: se a das 01:00
 * falhar por qualquer motivo (deploy em andamento, erro transiente), a das
 * 07:00 pega o que sobrou — a função é idempotente (só fecha turno que
 * ainda está ABERTO com entrada antes de hoje), então rodar duas vezes no
 * mesmo dia não tem efeito colateral quando a primeira já deu conta.
 * Mesma checagem de segredo do cron de backup.
 *
 * Não dispara mais backup próprio (Thiago, 2026-09-23): chegou a gerar 3
 * snapshots por dia somados ao /api/cron/backup, inflando o Vercel Blob à
 * toa. Com o backup diário de madrugada (JSON, ver src/lib/backup.ts) +
 * o pg_dump criptografado diário no GitHub Actions (.github/workflows/
 * backup-db.yml), a proteção já é dupla sem precisar de um terceiro. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await fecharTurnosAtrasados();
  const pontoClt = await sinalizarRegistrosPontoPendentes();

  return NextResponse.json({ ok: true, ...resultado, ...pontoClt });
}
