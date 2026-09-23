import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { gerarPdfFichaEpi } from "@/lib/ficha-epi-pdf";
import { sanitizarNomeArquivo } from "@/lib/texto";
import { requireResponsavelGed } from "@/lib/ged";

export async function GET(_req: Request, { params }: { params: Promise<{ pessoaId: string }> }) {
  const sessao = await requireResponsavelGed();
  const { pessoaId: pessoaIdBruto } = await params;
  const pessoaId = Number(pessoaIdBruto);
  if (!Number.isInteger(pessoaId)) notFound();

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    select: { cargo: true, matriculaInterna: true, pessoa: { select: { nome: true } } },
  });
  if (!vinculo) notFound();

  const [empresa, entradas] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId }, select: { nome: true } }),
    prisma.entradaEpi.findMany({
      where: { empresaId: sessao.empresaEfetivoId, pessoaId },
      orderBy: { dataEntrega: "asc" },
    }),
  ]);

  const pdfBytes = await gerarPdfFichaEpi({
    empresaNome: empresa.nome,
    pessoaNome: vinculo.pessoa.nome,
    matriculaInterna: vinculo.matriculaInterna,
    cargo: vinculo.cargo,
    entradas: entradas.map((e) => ({
      item: e.item,
      quantidade: e.quantidade,
      numeroCA: e.numeroCA,
      valorUnitario: e.valorUnitario !== null ? Number(e.valorUnitario) : null,
      dataEntrega: e.dataEntrega,
    })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-epi-${sanitizarNomeArquivo(vinculo.pessoa.nome)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
