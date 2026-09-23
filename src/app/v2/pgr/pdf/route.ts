import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireResponsavelPgr, buscarUltimoCicloEncerradoPgr, calcularMatrizPgr } from "@/lib/pgr";
import { gerarPdfPgr } from "@/lib/pgr-pdf";
import { dataISOBrasil } from "@/lib/data";

export async function GET() {
  const sessao = await requireResponsavelPgr();

  const [empresa, ultimoEncerrado] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId }, select: { nome: true } }),
    buscarUltimoCicloEncerradoPgr(sessao.empresaEfetivoId),
  ]);
  if (!ultimoEncerrado) notFound();

  const [matriz, acoes] = await Promise.all([
    calcularMatrizPgr(ultimoEncerrado.id),
    prisma.acaoPgr.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    }),
  ]);

  const cicloEncerradoEmLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(ultimoEncerrado.encerradoEm!);

  const pdfBytes = await gerarPdfPgr({
    empresaNome: empresa.nome,
    cicloEncerradoEmLabel,
    totalRespostas: matriz.totalRespostas,
    matrizGeral: matriz.geral,
    matrizPorCargo: matriz.porCargo,
    acoes: acoes.map((a) => ({
      dimensao: a.dimensao,
      descricaoRisco: a.descricaoRisco,
      medida: a.medida,
      status: a.status,
    })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pgr-${dataISOBrasil(ultimoEncerrado.encerradoEm!)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
