import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil, inicioDoDiaBrasil } from "@/lib/data";
import {
  gerarPdfRelatorioPagamentos,
  type LinhaRelatorioPagamento,
} from "@/lib/relatorio-pagamentos-pdf";

/** Sempre o dia anterior — é o que o financeiro lança de manhã. Sem essa
 * integração automática (Stone) ainda, é o jeito de ela ver de uma vez só
 * quem, quanto e em qual chave PIX precisa lançar. */
export async function GET() {
  const sessao = await requireTenant();

  const hoje = inicioDoDiaBrasil(new Date());
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

  const [empresa, turnos] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: { nome: true },
    }),
    prisma.turno.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        horaEntrada: { gte: ontem, lt: hoje },
        horaSaida: { not: null },
      },
      orderBy: { pessoa: { nome: "asc" } },
      select: {
        horaEntrada: true,
        horaSaida: true,
        valorTotal: true,
        status: true,
        modoPagamentoAplicado: true,
        pessoa: { select: { nome: true, chavePix: true, tipoChavePix: true } },
        funcao: { select: { nome: true } },
      },
    }),
  ]);

  const itens: LinhaRelatorioPagamento[] = turnos
    .filter(
      (t): t is typeof t & { horaSaida: Date; valorTotal: NonNullable<typeof t.valorTotal> } =>
        t.horaSaida !== null && t.valorTotal !== null
    )
    .map((t) => ({
      pessoaNome: t.pessoa.nome,
      funcaoNome: t.funcao.nome,
      modoPagamento: t.modoPagamentoAplicado,
      horaEntrada: t.horaEntrada,
      horaSaida: t.horaSaida,
      valorTotal: Number(t.valorTotal),
      chavePix: t.pessoa.chavePix,
      tipoChavePix: t.pessoa.tipoChavePix,
      status: t.status,
    }));

  const dataLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(ontem);

  const pdfBytes = await gerarPdfRelatorioPagamentos({
    empresaNome: empresa.nome,
    dataLabel,
    itens,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pagamentos-${dataISOBrasil(ontem)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
