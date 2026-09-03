import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireResponsavelEtica, slaVencido, CATEGORIAS_DENUNCIA, STATUS_DENUNCIA_ORDEM } from "@/lib/etica";
import { gerarPdfListaDenuncias } from "@/lib/denuncia-pdf";
import type { CategoriaDenuncia, GravidadeDenuncia, StatusDenuncia } from "@/generated/prisma/enums";

export async function GET(req: Request) {
  const sessao = await requireResponsavelEtica();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const categoria = url.searchParams.get("categoria");
  const gravidade = url.searchParams.get("gravidade");

  const statusFiltro = STATUS_DENUNCIA_ORDEM.includes(status as StatusDenuncia) ? (status as StatusDenuncia) : null;
  const categoriaFiltro = CATEGORIAS_DENUNCIA.some((c) => c.valor === categoria) ? (categoria as CategoriaDenuncia) : null;
  const gravidadeFiltro = (["BAIXA", "MEDIA", "ALTA"] as const).includes(gravidade as GravidadeDenuncia)
    ? (gravidade as GravidadeDenuncia)
    : null;

  const [empresa, casos] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId }, select: { nome: true } }),
    prisma.denuncia.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        ...(statusFiltro ? { status: statusFiltro } : {}),
        ...(categoriaFiltro ? { categoria: categoriaFiltro } : {}),
        ...(gravidadeFiltro ? { gravidade: gravidadeFiltro } : {}),
      },
      orderBy: { criadoEm: "desc" },
      select: { protocolo: true, categoria: true, status: true, gravidade: true, criadoEm: true, prazoSlaEm: true },
    }),
  ]);

  const pdfBytes = await gerarPdfListaDenuncias({
    empresaNome: empresa.nome,
    itens: casos.map((c) => ({
      protocolo: c.protocolo,
      categoria: c.categoria,
      status: c.status,
      gravidade: c.gravidade,
      criadoEm: c.criadoEm,
      slaVencido: slaVencido(c),
    })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="central-de-etica.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
