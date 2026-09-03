import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { gerarPdfReciboGrupo } from "@/lib/recibo-grupo-pdf";
import { sanitizarNomeArquivo } from "@/lib/texto";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireTenant();
  const grupoId = Number((await params).id);
  if (!Number.isInteger(grupoId)) notFound();

  const grupo = await prisma.grupoPagamento.findUnique({
    where: { id: grupoId },
    include: {
      empresa: { select: { nome: true, cnpj: true } },
      pessoa: { select: { nome: true, documento: true, tipoDocumento: true } },
      pagamentos: {
        select: {
          chavePixDestino: true,
          tipoChavePixDestino: true,
          valor: true,
          turno: { select: { horaEntrada: true, horaSaida: true, funcao: { select: { nome: true } } } },
        },
      },
    },
  });
  if (!grupo || grupo.empresaId !== sessao.empresaEfetivoId) notFound();
  if (grupo.pagamentos.length === 0) notFound();

  const primeiro = grupo.pagamentos[0];
  const pdfBytes = await gerarPdfReciboGrupo({
    empresaNome: grupo.empresa.nome,
    empresaCnpj: grupo.empresa.cnpj,
    pessoaNome: grupo.pessoa.nome,
    pessoaDocumento: grupo.pessoa.documento,
    pessoaTipoDocumento: grupo.pessoa.tipoDocumento,
    chavePixDestino: primeiro.chavePixDestino,
    tipoChavePixDestino: primeiro.tipoChavePixDestino,
    criadoEm: grupo.criadoEm,
    itens: grupo.pagamentos
      .filter((p): p is typeof p & { turno: { horaEntrada: Date; horaSaida: Date; funcao: { nome: string } } } =>
        p.turno.horaSaida !== null
      )
      .map((p) => ({
        funcaoNome: p.turno.funcao.nome,
        horaEntrada: p.turno.horaEntrada,
        horaSaida: p.turno.horaSaida,
        valorTotal: Number(p.valor),
      })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-agrupado-${sanitizarNomeArquivo(grupo.pessoa.nome)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
