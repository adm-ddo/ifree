import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil, formatarDataHoraComDiaSemana, inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { gerarPdfRelatorioPessoa } from "@/lib/relatorio-pessoa-pdf";
import { sanitizarNomeArquivo } from "@/lib/texto";

type Preset = "hoje" | "ontem" | "semana" | "mes";

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim: agora };
  if (preset === "ontem") {
    const hoje = inicioDoDiaBrasil(agora);
    return { inicio: new Date(hoje.getTime() - 24 * 60 * 60 * 1000), fim: hoje };
  }
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim: agora };
  return { inicio: inicioDoMesBrasil(agora), fim: agora };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireTenant();
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) {
    return new NextResponse("Pessoa inválida", { status: 400 });
  }

  const url = new URL(req.url);
  const preset = url.searchParams.get("preset");
  const inicioParam = url.searchParams.get("inicio");
  const fimParam = url.searchParams.get("fim");

  const agora = new Date();
  const presetValido: Preset =
    preset === "hoje" || preset === "ontem" || preset === "semana" ? preset : "mes";
  const periodoCustomizado = Boolean(inicioParam && fimParam);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicioParam}T00:00:00-03:00`), fim: new Date(`${fimParam}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  const [empresa, pessoa, turnos] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: { nome: true },
    }),
    prisma.pessoa.findUnique({ where: { id: pessoaId }, select: { nome: true } }),
    prisma.turno.findMany({
      where: {
        pessoaId,
        empresaId: sessao.empresaEfetivoId,
        horaEntrada: { gte: dataInicio, lte: dataFim },
      },
      orderBy: { horaEntrada: "asc" },
      select: {
        horaEntrada: true,
        minutosArredondados: true,
        status: true,
        valorTotal: true,
        funcao: { select: { nome: true } },
      },
    }),
  ]);

  if (!pessoa) {
    return new NextResponse("Pessoa não encontrada", { status: 404 });
  }

  const formatarDataLonga = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(d);
  const periodoLabel = periodoCustomizado
    ? `${formatarDataLonga(dataInicio)} a ${formatarDataLonga(dataFim)}`
    : { hoje: "hoje", ontem: "ontem", semana: "esta semana", mes: "este mês" }[presetValido];

  const pdfBytes = await gerarPdfRelatorioPessoa({
    empresaNome: empresa.nome,
    pessoaNome: pessoa.nome,
    periodoLabel,
    itens: turnos.map((t) => ({
      entradaLabel: formatarDataHoraComDiaSemana(t.horaEntrada),
      funcaoNome: t.funcao.nome,
      minutosArredondados: t.minutosArredondados,
      status: t.status,
      valorTotal: t.valorTotal !== null ? Number(t.valorTotal) : null,
    })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-${sanitizarNomeArquivo(pessoa.nome)}-${dataISOBrasil(dataInicio)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
