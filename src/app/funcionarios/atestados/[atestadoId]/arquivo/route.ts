import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { baixarComoResponse } from "@/lib/blob";
import { sanitizarNomeArquivo } from "@/lib/texto";

/** Serve o anexo (foto/scan) de um AtestadoClt — mesmo padrão de
 * /ged/documentos/[id]/assinado: o Blob é privado, então precisa desse
 * proxy autenticado em vez de expor a URL direto. */
export async function GET(req: Request, { params }: { params: Promise<{ atestadoId: string }> }) {
  const sessao = await requireModulo("funcionarios");
  const { atestadoId: atestadoIdBruto } = await params;
  const atestadoId = Number(atestadoIdBruto);
  if (!Number.isInteger(atestadoId)) notFound();

  const atestado = await prisma.atestadoClt.findUnique({
    where: { id: atestadoId },
    include: { pessoa: { select: { nome: true } } },
  });
  if (!atestado || atestado.empresaId !== sessao.empresaEfetivoId) notFound();
  if (!atestado.arquivoUrl) {
    return new Response("Esse atestado não tem arquivo anexado.", { status: 400 });
  }

  const verInline = new URL(req.url).searchParams.get("ver") === "1";
  return baixarComoResponse(
    atestado.arquivoUrl,
    `atestado-${sanitizarNomeArquivo(atestado.pessoa.nome)}`,
    verInline ? "inline" : "attachment"
  );
}
