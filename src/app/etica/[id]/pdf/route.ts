import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireResponsavelEtica } from "@/lib/etica";
import { gerarPdfDenuncia } from "@/lib/denuncia-pdf";
import { sanitizarNomeArquivo } from "@/lib/texto";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await requireResponsavelEtica();
  const { id } = await params;
  const denunciaId = Number(id);
  if (!Number.isInteger(denunciaId)) notFound();

  const [empresa, denuncia] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId }, select: { nome: true } }),
    prisma.denuncia.findUnique({
      where: { id: denunciaId },
      select: {
        empresaId: true,
        protocolo: true,
        categoria: true,
        gravidade: true,
        status: true,
        identificado: true,
        descricao: true,
        criadoEm: true,
        prazoSlaEm: true,
        finalizadoEm: true,
        pessoa: { select: { nome: true } },
        etapas: { orderBy: { criadoEm: "asc" }, select: { status: true, observacao: true, autorEmail: true, criadoEm: true } },
        mensagens: { orderBy: { criadoEm: "asc" }, select: { autor: true, texto: true, criadoEm: true } },
        logs: { orderBy: { criadoEm: "asc" }, select: { acao: true, detalhe: true, autorEmail: true, criadoEm: true } },
      },
    }),
  ]);
  if (!denuncia || denuncia.empresaId !== sessao.empresaEfetivoId) notFound();

  const pdfBytes = await gerarPdfDenuncia({
    empresaNome: empresa.nome,
    protocolo: denuncia.protocolo,
    categoria: denuncia.categoria,
    gravidade: denuncia.gravidade,
    status: denuncia.status,
    identificado: denuncia.identificado,
    pessoaNome: denuncia.pessoa?.nome ?? null,
    descricao: denuncia.descricao,
    criadoEm: denuncia.criadoEm,
    prazoSlaEm: denuncia.prazoSlaEm,
    finalizadoEm: denuncia.finalizadoEm,
    etapas: denuncia.etapas,
    mensagens: denuncia.mensagens,
    logs: denuncia.logs,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="denuncia-${sanitizarNomeArquivo(denuncia.protocolo)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
