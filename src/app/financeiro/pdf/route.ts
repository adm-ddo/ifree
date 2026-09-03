import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil, dataISOBrasil } from "@/lib/data";
import { totalDevido, relatorioPagos, agruparPagamentos, type Agrupamento } from "@/lib/financeiro";
import { gerarPdfFinanceiro } from "@/lib/relatorio-financeiro-pdf";

type Preset = "hoje" | "semana" | "mes";

const LABEL_AGRUPAMENTO: Record<Agrupamento, string> = {
  dia: "por dia",
  semana: "por semana",
  mes: "por mês",
  pessoa: "por pessoa",
};

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  const fim = agora;
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim };
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim };
  return { inicio: inicioDoMesBrasil(agora), fim };
}

export async function GET(req: Request) {
  const sessao = await requireTenant();
  const url = new URL(req.url);
  const preset = url.searchParams.get("preset");
  const inicioParam = url.searchParams.get("inicio");
  const fimParam = url.searchParams.get("fim");
  const agrupar = url.searchParams.get("agrupar");

  const presetValido: Preset = preset === "hoje" || preset === "semana" ? preset : "mes";
  const agrupamentoValido: Agrupamento =
    agrupar === "dia" || agrupar === "semana" || agrupar === "mes" || agrupar === "pessoa"
      ? agrupar
      : "dia";

  const agora = new Date();
  const periodoCustomizado = Boolean(inicioParam && fimParam);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? {
        inicio: new Date(`${inicioParam}T00:00:00-03:00`),
        fim: new Date(`${fimParam}T23:59:59-03:00`),
      }
    : calcularPeriodo(presetValido, agora);

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true },
  });

  const [devidoAgora, linhas] = await Promise.all([
    totalDevido(sessao.empresaEfetivoId),
    relatorioPagos(sessao.empresaEfetivoId, dataInicio, dataFim),
  ]);

  const grupos = agruparPagamentos(linhas, agrupamentoValido);

  const formatarDataLonga = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(d);
  const periodoLabel = periodoCustomizado
    ? `${formatarDataLonga(dataInicio)} a ${formatarDataLonga(dataFim)}`
    : PRESET_LABEL[presetValido];

  const pdfBytes = await gerarPdfFinanceiro({
    empresaNome: empresa.nome,
    periodoLabel,
    agrupamentoLabel: LABEL_AGRUPAMENTO[agrupamentoValido],
    totalDevidoAgora: devidoAgora,
    itens: grupos.map((g) => ({ chave: g.chave, quantidade: g.quantidade, valor: g.valor })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="financeiro-${dataISOBrasil(dataInicio)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const PRESET_LABEL: Record<Preset, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
};
