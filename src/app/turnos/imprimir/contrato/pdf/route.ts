import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { buscarTurnoDaEmpresa } from "@/lib/turno";
import { baixarComoDataUrl } from "@/lib/blob";
import { gerarPdfContratos, type DadosContrato } from "@/lib/contrato-pdf";
import { resolverTermos } from "@/lib/termos";

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
  const encontrados = turnos.filter((t): t is NonNullable<typeof t> => t !== null);
  if (encontrados.length === 0) notFound();

  const itens: DadosContrato[] = await Promise.all(
    encontrados.map(async (turno) => ({
      empresaNome: turno.empresa.nome,
      empresaCnpj: turno.empresa.cnpj,
      pessoaNome: turno.pessoa.nome,
      pessoaDocumento: turno.pessoa.documento,
      pessoaTipoDocumento: turno.pessoa.tipoDocumento,
      funcaoNome: turno.funcao.nome,
      valorHoraAplicado: Number(turno.valorHoraAplicado),
      horaEntrada: turno.horaEntrada,
      assinaturaContratoDataUrl: await baixarComoDataUrl(turno.assinaturaContratoUrl),
      termos: resolverTermos(turno.empresa.termosContrato, turno.empresa.modoPausa),
    }))
  );

  const pdfBytes = await gerarPdfContratos(itens);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="termos-${encontrados.length}-turnos.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
