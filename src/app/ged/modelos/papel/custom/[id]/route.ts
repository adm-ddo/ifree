import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { baixarComoResponse, extensaoPorContentType } from "@/lib/blob";
import { sanitizarNomeArquivo } from "@/lib/texto";
import { requireResponsavelGed } from "@/lib/ged";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireResponsavelGed();
  const { id } = await params;
  const modeloId = Number(id);
  if (!Number.isInteger(modeloId)) notFound();

  const modelo = await prisma.modeloPapelGed.findUnique({ where: { id: modeloId } });
  if (!modelo || modelo.empresaId !== sessao.empresaEfetivoId) notFound();

  const nomeArquivo = `${sanitizarNomeArquivo(modelo.nome)}${extensaoPorContentType(modelo.contentType)}`;
  return baixarComoResponse(modelo.arquivoUrl, nomeArquivo);
}
