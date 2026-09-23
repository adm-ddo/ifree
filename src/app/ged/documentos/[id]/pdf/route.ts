import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireResponsavelGed } from "@/lib/ged";
import { gerarPdfDocumentoGed } from "@/lib/documento-ged-pdf";
import { gerarPdfSuspensao, gerarPdfSuspensaoFaltaInjustificada } from "@/lib/suspensao-pdf";
import { gerarPdfTermoCiencia } from "@/lib/termo-ciencia-pdf";
import { gerarPdfDeclaracaoOfertaClt } from "@/lib/declaracao-oferta-clt-pdf";
import { sanitizarNomeArquivo } from "@/lib/texto";
import { MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID } from "@/lib/ged";
import type { SnapshotDadosGed, SnapshotSuspensaoGed, SnapshotTermoCienciaGed } from "@/lib/ged";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireResponsavelGed();
  const { id } = await params;
  const documentoId = Number(id);
  if (!Number.isInteger(documentoId)) notFound();

  const documento = await prisma.documentoGed.findUnique({ where: { id: documentoId } });
  if (!documento || documento.empresaId !== sessao.empresaEfetivoId) notFound();

  const snapshot = documento.snapshotDados as unknown as SnapshotDadosGed;

  let pdfBytes: Buffer;
  if (documento.tipo === "SUSPENSAO") {
    const s = documento.snapshotDados as unknown as SnapshotSuspensaoGed;
    if (s.modelo === MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID) {
      pdfBytes = await gerarPdfSuspensaoFaltaInjustificada({
        pessoaNome: s.pessoaNome,
        pessoaDocumento: s.pessoaDocumento,
        cargo: s.cargo,
        dataFalta: new Date(s.dataFalta!),
        periodoTurno: s.periodoTurno!,
        diasSuspensao: s.diasSuspensao,
        periodoInicio: new Date(s.periodoInicio),
        empresaNome: s.empresaNome,
        empresaCnpj: s.empresaCnpj,
        historico: s.historico ?? [],
      });
    } else {
      pdfBytes = await gerarPdfSuspensao({
        pessoaNome: s.pessoaNome,
        pessoaDocumento: s.pessoaDocumento,
        cargo: s.cargo,
        motivo: s.motivo,
        diasSuspensao: s.diasSuspensao,
        periodoInicio: new Date(s.periodoInicio),
        empresaNome: s.empresaNome,
        empresaCnpj: s.empresaCnpj,
      });
    }
  } else if (documento.tipo === "TERMO_CIENCIA") {
    const s = documento.snapshotDados as unknown as SnapshotTermoCienciaGed;
    const paragrafos = documento.corpoTexto.split(/\n\s*\n/).filter((p) => p.trim());
    if (s.termoSlug === "opcao-autonomo-apos-oferta-clt") {
      pdfBytes = await gerarPdfDeclaracaoOfertaClt({
        titulo: s.termoNome,
        paragrafos,
        pessoaNome: s.pessoaNome,
        pessoaDocumento: s.pessoaDocumento,
        dataDocumento: documento.dataDocumento,
      });
    } else {
      pdfBytes = await gerarPdfTermoCiencia({
        titulo: s.termoNome,
        paragrafos,
        pessoaNome: s.pessoaNome,
        pessoaDocumento: s.pessoaDocumento,
        dataDocumento: documento.dataDocumento,
      });
    }
  } else {
    pdfBytes = await gerarPdfDocumentoGed({
      tipo: documento.tipo,
      empresaNome: snapshot.empresaNome,
      empresaCnpj: snapshot.empresaCnpj,
      pessoaNome: snapshot.pessoaNome,
      pessoaDocumento: snapshot.pessoaDocumento,
      cargo: snapshot.cargo,
      ctpsNumero: snapshot.ctpsNumero,
      ctpsSerieUf: snapshot.ctpsSerieUf,
      dataDocumento: documento.dataDocumento,
      corpoTexto: documento.corpoTexto,
    });
  }

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${documento.tipo.toLowerCase()}-${sanitizarNomeArquivo(snapshot.pessoaNome)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
