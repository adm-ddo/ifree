import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil, inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { calcularMinutosNoturnos } from "@/lib/ponto";
import { gerarPdfRelatorioHorasClt, type LinhaRelatorioHoras } from "@/lib/relatorio-horas-clt-pdf";

type Preset = "hoje" | "semana" | "mes";

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

  const agora = new Date();
  const presetValido: Preset = preset === "hoje" || preset === "semana" ? preset : "mes";
  const periodoCustomizado = Boolean(inicioParam && fimParam);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicioParam}T00:00:00-03:00`), fim: new Date(`${fimParam}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  const [empresa, registros] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: { nome: true },
    }),
    prisma.registroPonto.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        status: "CONCLUIDO",
        horaEntrada: { gte: dataInicio, lte: dataFim },
      },
      orderBy: { pessoa: { nome: "asc" } },
      include: {
        pessoa: {
          select: {
            nome: true,
            vinculos: {
              where: { empresaId: sessao.empresaEfetivoId },
              select: { escalaTrabalho: true },
            },
          },
        },
      },
    }),
  ]);

  const itens: LinhaRelatorioHoras[] = registros
    .filter(
      (r): r is typeof r & { horaSaida: Date; minutosTrabalhados: number } =>
        r.horaSaida !== null && r.minutosTrabalhados !== null
    )
    .map((r) => ({
      pessoaNome: r.pessoa.nome,
      escalaTrabalho: r.pessoa.vinculos[0]?.escalaTrabalho ?? null,
      horaEntrada: r.horaEntrada,
      entradaIntervalo: r.entradaIntervalo,
      saidaIntervalo: r.saidaIntervalo,
      horaSaida: r.horaSaida,
      minutosTrabalhados: r.minutosTrabalhados,
      minutosNoturnos: calcularMinutosNoturnos(r.horaEntrada, r.horaSaida),
      encerradoManualmente: r.correcaoSaidaEm !== null,
    }));

  const formatarDataLonga = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(d);
  const periodoLabel = periodoCustomizado
    ? `${formatarDataLonga(dataInicio)} a ${formatarDataLonga(dataFim)}`
    : { hoje: "hoje", semana: "esta semana", mes: "este mês" }[presetValido];

  const pdfBytes = await gerarPdfRelatorioHorasClt({
    empresaNome: empresa.nome,
    periodoLabel,
    itens,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="horas-clt-${dataISOBrasil(dataInicio)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
