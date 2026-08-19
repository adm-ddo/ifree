import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { buscarTurnoDaEmpresa, type TurnoComRelacoes } from "@/lib/turno";
import { baixarComoDataUrl } from "@/lib/blob";
import { gerarPdfRecibos, type DadosRecibo } from "@/lib/recibo-pdf";

type TurnoComRecibo = TurnoComRelacoes & {
  horaSaida: NonNullable<TurnoComRelacoes["horaSaida"]>;
  assinaturaReciboUrl: NonNullable<TurnoComRelacoes["assinaturaReciboUrl"]>;
  valorTotal: NonNullable<TurnoComRelacoes["valorTotal"]>;
};

function temRecibo(turno: TurnoComRelacoes): turno is TurnoComRecibo {
  return (
    turno.horaSaida !== null &&
    turno.assinaturaReciboUrl !== null &&
    turno.valorTotal !== null
  );
}

export async function GET(req: Request) {
  const sessao = await requireTenant();

  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n));
  if (ids.length === 0) notFound();

  const turnos = await Promise.all(
    ids.map((id) => buscarTurnoDaEmpresa(id, sessao.empresaEfetivoId))
  );
  const encontrados = turnos
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .filter(temRecibo);
  if (encontrados.length === 0) notFound();

  const itens: DadosRecibo[] = await Promise.all(
    encontrados.map(async (turno) => ({
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
      assinaturaReciboDataUrl: await baixarComoDataUrl(turno.assinaturaReciboUrl),
    }))
  );

  const pdfBytes = await gerarPdfRecibos(itens);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibos-${encontrados.length}-turnos.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
