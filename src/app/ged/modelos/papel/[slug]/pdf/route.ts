import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { gerarPdfModeloPapel } from "@/lib/modelo-papel-pdf";
import { gerarPdfControleTrocaOleo } from "@/lib/controle-troca-oleo-pdf";
import { MODELOS_PADRAO_PAPEL, requireResponsavelGed } from "@/lib/ged";
import { sanitizarNomeArquivo } from "@/lib/texto";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const sessao = await requireResponsavelGed();
  const { slug } = await params;
  const modelo = MODELOS_PADRAO_PAPEL.find((m) => m.slug === slug);
  if (!modelo) notFound();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true },
  });

  // "troca-oleo-fritadeira" tem layout próprio (modelo real cedido pelo
  // Thiago, com marcadores de Manhã/Noite e Filtrado/Trocado já impressos
  // em cada linha) — os demais modelos padrão seguem o gerador genérico
  // de colunas livres.
  const pdfBytes =
    slug === "troca-oleo-fritadeira"
      ? await gerarPdfControleTrocaOleo({ empresaNome: empresa.nome })
      : await gerarPdfModeloPapel({
          empresaNome: empresa.nome,
          titulo: modelo.nome,
          colunas: modelo.colunas,
        });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sanitizarNomeArquivo(modelo.nome)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
