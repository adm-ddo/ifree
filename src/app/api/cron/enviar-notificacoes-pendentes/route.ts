import { NextResponse } from "next/server";
import {
  processarNotificacoesPendentesVagaNova,
  processarNotificacoesPendentesPerfil,
} from "@/lib/match-passivo";

/** Rede de segurança do match passivo (ver src/lib/match-passivo.ts): a
 * própria action já tenta mandar os e-mails pendentes via after() logo
 * depois de responder pra quem disparou o evento (empresa publicando
 * vaga, ou pessoa editando perfil) — isso cobre o caso comum. Esta rota
 * roda de tempos em tempos (ver vercel.json) só pra pegar o que sobrou:
 * leva grande demais pra caber no tempo do after(), instância que caiu
 * no meio, ou falha pontual de envio. Idempotente — só mexe em linha
 * com notificadoEm=null, nunca reenvia quem já foi notificado. */
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [vagaNova, perfil] = await Promise.all([
    processarNotificacoesPendentesVagaNova(),
    processarNotificacoesPendentesPerfil(),
  ]);

  return NextResponse.json({ ok: true, vagaNova, perfil });
}
