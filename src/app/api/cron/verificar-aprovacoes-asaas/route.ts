import { NextResponse } from "next/server";
import { verificarAprovacoesAsaasPendentes } from "@/lib/pagamentos/asaas-conta-status";

/** Chamada pelo Vercel Cron (ver vercel.json), a cada 3h — avisa por
 * e-mail quem teve a conta Asaas aprovada de verdade (status ATIVA E
 * documentos liberados) enquanto ninguém abriu /configuracoes ou
 * /pagamentos pra descobrir isso ao vivo. Não existe webhook da Asaas
 * pra aprovação de conta, só polling (ver verificarAprovacoesAsaasPendentes
 * em src/lib/pagamentos/asaas-conta-status.ts). Mesma checagem de segredo
 * dos outros crons do projeto. Sem nenhuma empresa PENDENTE_ATIVACAO,
 * roda e não faz nada — seguro deixar ativo sempre. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const resultado = await verificarAprovacoesAsaasPendentes();
  return NextResponse.json({ ok: true, ...resultado });
}
