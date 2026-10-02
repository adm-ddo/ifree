import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil, inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { listarTurnosDiario } from "@/lib/relatorio";
import { gerarPdfRelatorioDiario } from "@/lib/relatorio-diario-pdf";

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

export async function GET(req: Request) {
  const sessao = await requireTenant();

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

  const [empresa, dias] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: { nome: true },
    }),
    listarTurnosDiario(sessao.empresaEfetivoId, dataInicio, dataFim),
  ]);

  const formatarDataLonga = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(d);
  const periodoLabel = periodoCustomizado
    ? `${formatarDataLonga(dataInicio)} a ${formatarDataLonga(dataFim)}`
    : { hoje: "hoje", ontem: "ontem", semana: "esta semana", mes: "este mês" }[presetValido];

  const totalValor = dias.reduce((soma, d) => soma + d.totalValor, 0);

  const pdfBytes = await gerarPdfRelatorioDiario({
    empresaNome: empresa.nome,
    periodoLabel,
    totalValor,
    dias,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-diario-${dataISOBrasil(dataInicio)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
