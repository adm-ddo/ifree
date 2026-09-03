import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { buscarTurnoDaEmpresa, type TurnoComRelacoes } from "@/lib/turno";
import { baixarComoDataUrl } from "@/lib/blob";
import { gerarPdfRecibos, type DadosRecibo } from "@/lib/recibo-pdf";

type TurnoComRecibo = TurnoComRelacoes & {
  horaSaida: NonNullable<TurnoComRelacoes["horaSaida"]>;
  valorTotal: NonNullable<TurnoComRelacoes["valorTotal"]>;
};

// Não exige mais assinaturaReciboUrl — turnos encerrados automaticamente
// (ninguém bateu a saída) também geram recibo agora, sem a imagem de
// assinatura, com um aviso no lugar (ver src/lib/recibo-pdf.tsx).
function temRecibo(turno: TurnoComRelacoes): turno is TurnoComRecibo {
  return turno.horaSaida !== null && turno.valorTotal !== null;
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
      // Turno sempre é do caminho EXTRA, que sempre tem PIX — "??" só
      // satisfaz o tipo (chavePix é opcional no schema pra acomodar o CLT).
      chavePixDestino: turno.pessoa.chavePix ?? "",
      tipoChavePixDestino: turno.pessoa.tipoChavePix ?? "CPF",
      assinaturaReciboDataUrl: turno.assinaturaReciboUrl
        ? await baixarComoDataUrl(turno.assinaturaReciboUrl)
        : null,
      fechamentoAutomatico: turno.fechamentoAutomatico,
      correcaoSaidaEm: turno.correcaoSaidaEm,
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
