import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { buscarTurnoDaEmpresa } from "@/lib/turno";
import { baixarComoDataUrl } from "@/lib/blob";
import { gerarPdfRecibo } from "@/lib/recibo-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await requireTenant();
  const { id } = await params;
  const turnoId = Number(id);
  if (!Number.isInteger(turnoId)) notFound();

  const turno = await buscarTurnoDaEmpresa(turnoId, sessao.empresaEfetivoId);
  if (!turno || !turno.horaSaida || !turno.assinaturaReciboUrl || turno.valorTotal === null) {
    notFound();
  }

  const assinaturaReciboDataUrl = await baixarComoDataUrl(turno.assinaturaReciboUrl);

  const pdfBytes = await gerarPdfRecibo({
    empresaNome: turno.empresa.nome,
    empresaCnpj: turno.empresa.cnpj,
    pessoaNome: turno.pessoa.nome,
    pessoaDocumento: turno.pessoa.documento,
    pessoaTipoDocumento: turno.pessoa.tipoDocumento,
    funcaoNome: turno.funcao.nome,
    valorHoraAplicado: Number(turno.valorHoraAplicado),
    modoPagamentoAplicado: turno.modoPagamentoAplicado,
    valorDiariaAplicada:
      turno.valorDiariaAplicada !== null ? Number(turno.valorDiariaAplicada) : null,
    horaEntrada: turno.horaEntrada,
    horaSaida: turno.horaSaida,
    minutosDescontadosPausa: turno.minutosDescontadosPausa ?? 0,
    minutosArredondados: turno.minutosArredondados ?? 0,
    valorTotal: Number(turno.valorTotal),
    chavePixDestino: turno.pessoa.chavePix,
    tipoChavePixDestino: turno.pessoa.tipoChavePix,
    assinaturaReciboDataUrl,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-turno-${turno.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
