import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil, instanteBrasil } from "@/lib/data";
import { sanitizarNomeArquivo } from "@/lib/texto";
import { gerarPdfReciboAjudaCusto } from "@/lib/recibo-ajuda-custo-pdf";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await requireTenant();
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) notFound();

  const url = new URL(req.url);
  const mesParam = url.searchParams.get("mes");
  const dataParam = url.searchParams.get("data");
  const agora = new Date();
  const mesValido = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : dataISOBrasil(agora).slice(0, 7);
  const dataValida = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : dataISOBrasil(agora);

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    select: {
      tipoVinculo: true,
      recebeTransporte: true,
      transporteComDesconto: true,
      valorTransporte: true,
      pessoa: { select: { nome: true, documento: true } },
    },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") notFound();
  if (!vinculo.recebeTransporte || vinculo.transporteComDesconto) {
    return new NextResponse("Essa pessoa não tem ajuda de custo configurada (ver Adicionais e benefícios).", {
      status: 400,
    });
  }
  if (vinculo.valorTransporte === null) {
    return new NextResponse("Defina o valor da ajuda de custo antes de gerar o recibo.", { status: 400 });
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, cnpj: true },
  });

  const mesReferenciaLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(instanteBrasil(`${mesValido}-01`));
  const dataLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(instanteBrasil(dataValida));

  const pdfBytes = await gerarPdfReciboAjudaCusto({
    empresaNome: empresa.nome,
    empresaCnpj: empresa.cnpj,
    pessoaNome: vinculo.pessoa.nome,
    pessoaDocumento: vinculo.pessoa.documento,
    mesReferenciaLabel,
    dataLabel,
    valor: Number(vinculo.valorTransporte),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ajuda-de-custo-${sanitizarNomeArquivo(vinculo.pessoa.nome)}-${mesValido}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
