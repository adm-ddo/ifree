import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarPdfRegulamentoInterno } from "@/lib/regulamento-interno-pdf";
import { resolverRegulamentoInterno, requireResponsavelGed } from "@/lib/ged";
import { sanitizarNomeArquivo } from "@/lib/texto";

export async function GET() {
  const sessao = await requireResponsavelGed();
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, cnpj: true, regulamentoInterno: true },
  });

  const pdfBytes = await gerarPdfRegulamentoInterno({
    empresaNome: empresa.nome,
    empresaCnpj: empresa.cnpj,
    paragrafos: resolverRegulamentoInterno(empresa.regulamentoInterno, empresa.nome, empresa.cnpj),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="regulamento-interno-${sanitizarNomeArquivo(empresa.nome)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
