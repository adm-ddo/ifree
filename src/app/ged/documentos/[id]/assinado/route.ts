import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { baixarComoResponse } from "@/lib/blob";
import { sanitizarNomeArquivo } from "@/lib/texto";
import { requireResponsavelGed } from "@/lib/ged";
import type { SnapshotDadosGed } from "@/lib/ged";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireResponsavelGed();
  const { id } = await params;
  const documentoId = Number(id);
  if (!Number.isInteger(documentoId)) notFound();

  const documento = await prisma.documentoGed.findUnique({ where: { id: documentoId } });
  if (!documento || documento.empresaId !== sessao.empresaEfetivoId) notFound();
  if (!documento.arquivoAssinadoUrl) {
    return new Response("Esse documento ainda não tem scan assinado anexado.", { status: 400 });
  }

  // ?ver=1 exibe o arquivo direto na aba (imagem/PDF) em vez de baixar —
  // mesmo endpoint, só troca o Content-Disposition.
  const verInline = new URL(req.url).searchParams.get("ver") === "1";

  const snapshot = documento.snapshotDados as unknown as SnapshotDadosGed;
  return baixarComoResponse(
    documento.arquivoAssinadoUrl,
    `${documento.tipo.toLowerCase()}-assinado-${sanitizarNomeArquivo(snapshot.pessoaNome)}`,
    verInline ? "inline" : "attachment"
  );
}
