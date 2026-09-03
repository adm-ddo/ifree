import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil, inicioUltimaSemanaFechadaBrasil } from "@/lib/data";
import { gerarPdfRelatorioSemanal } from "@/lib/relatorio-semanal-pdf";
import type { TipoChavePix } from "@/generated/prisma/enums";

/** Sempre a última semana de pagamento já fechada por completo (ver
 * inicioUltimaSemanaFechadaBrasil) — só faz sentido pra quem está com
 * frequenciaPagamentoAplicada SEMANAL, agregado por pessoa. */
export async function GET() {
  const sessao = await requireTenant();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, semanaPagamentoInicioDia: true, semanaPagamentoDia: true },
  });

  const agora = new Date();
  const inicioSemana = inicioUltimaSemanaFechadaBrasil(agora, empresa.semanaPagamentoInicioDia);
  const fimSemana = new Date(inicioSemana.getTime() + 7 * 24 * 60 * 60 * 1000);

  const turnos = await prisma.turno.findMany({
    where: {
      empresaId: sessao.empresaEfetivoId,
      frequenciaPagamentoAplicada: "SEMANAL",
      horaEntrada: { gte: inicioSemana, lt: fimSemana },
      horaSaida: { not: null },
    },
    select: {
      valorTotal: true,
      pessoa: { select: { nome: true, chavePix: true, tipoChavePix: true } },
    },
  });

  const porPessoa = new Map<
    string,
    { chavePix: string; tipoChavePix: TipoChavePix; quantidadeTurnos: number; valorTotal: number }
  >();
  for (const turno of turnos) {
    if (turno.valorTotal === null) continue;
    // Turno com frequenciaPagamentoAplicada SEMANAL só existe pro caminho
    // EXTRA, que sempre tem PIX — o "??" aqui é só pra satisfazer o tipo
    // (Pessoa.chavePix é opcional no schema pra acomodar o CLT).
    const atual = porPessoa.get(turno.pessoa.nome) ?? {
      chavePix: turno.pessoa.chavePix ?? "",
      tipoChavePix: turno.pessoa.tipoChavePix ?? "CPF",
      quantidadeTurnos: 0,
      valorTotal: 0,
    };
    atual.quantidadeTurnos += 1;
    atual.valorTotal += Number(turno.valorTotal);
    porPessoa.set(turno.pessoa.nome, atual);
  }

  const itens = [...porPessoa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pessoaNome, dados]) => ({ pessoaNome, ...dados }));

  // Dia de pagamento cai na semana seguinte à que fechou (ex.: semana
  // segunda-domingo fecha, paga na quarta da semana que já começou).
  const diasAtePagamento =
    (empresa.semanaPagamentoDia - empresa.semanaPagamentoInicioDia + 7) % 7;
  const dataPagamento = new Date(
    fimSemana.getTime() + diasAtePagamento * 24 * 60 * 60 * 1000
  );

  const formatarDataLonga = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(d);

  const fimSemanaInclusive = new Date(fimSemana.getTime() - 24 * 60 * 60 * 1000);
  const periodoLabel = `${formatarDataLonga(inicioSemana)} a ${formatarDataLonga(fimSemanaInclusive)}`;

  const pdfBytes = await gerarPdfRelatorioSemanal({
    empresaNome: empresa.nome,
    periodoLabel,
    dataPagamentoLabel: formatarDataLonga(dataPagamento),
    itens,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pagamentos-semanal-${dataISOBrasil(inicioSemana)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
