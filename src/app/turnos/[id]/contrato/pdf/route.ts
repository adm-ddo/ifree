import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { buscarTurnoDaEmpresa } from "@/lib/turno";
import { baixarComoDataUrl } from "@/lib/blob";
import { gerarPdfContrato } from "@/lib/contrato-pdf";
import { resolverTermos } from "@/lib/termos";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await requireTenant();
  const { id } = await params;
  const turnoId = Number(id);
  if (!Number.isInteger(turnoId)) notFound();

  const turno = await buscarTurnoDaEmpresa(turnoId, sessao.empresaEfetivoId);
  if (!turno || !turno.assinaturaContratoUrl) notFound();

  const assinaturaContratoDataUrl = await baixarComoDataUrl(turno.assinaturaContratoUrl);

  const pdfBytes = await gerarPdfContrato({
    empresaNome: turno.empresa.nome,
    empresaCnpj: turno.empresa.cnpj,
    pessoaNome: turno.pessoa.nome,
    pessoaDocumento: turno.pessoa.documento,
    pessoaTipoDocumento: turno.pessoa.tipoDocumento,
    funcaoNome: turno.funcao.nome,
    valorHoraAplicado: Number(turno.valorHoraAplicado),
    horaEntrada: turno.horaEntrada,
    assinaturaContratoDataUrl,
    termos: resolverTermos(turno.empresa.termosContrato, turno.empresa.modoPausaDia, turno.empresa.modoPausaNoite),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrato-turno-${turno.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
