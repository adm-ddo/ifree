import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarCpf } from "@/lib/cpf";
import { instanteBrasil, dataISOBrasil, formatarDataSemHora } from "@/lib/data";
import { calcularMinutosNoturnos } from "@/lib/ponto";
import { calcularMetaMinutos } from "@/lib/resumo-horas";
import { sanitizarNomeArquivo } from "@/lib/texto";
import { gerarPdfEspelhoPonto, type LinhaEspelhoPonto } from "@/lib/espelho-ponto-pdf";

/// "YYYY-MM" do mês fechado anterior ao atual — mesmo espírito de
/// semanaPassadaFechada/mesPassadoFechado em src/lib/resumo-horas.ts, só
/// que aqui já formatado pro parâmetro ?mes= (o espelho é sempre por mês
/// inteiro, nunca por semana).
function mesPassadoISO(agora: Date): string {
  const [ano, mes] = dataISOBrasil(agora).split("-").map(Number);
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anoDoMesAnterior = mes === 1 ? ano - 1 : ano;
  return `${anoDoMesAnterior}-${String(mesAnterior).padStart(2, "0")}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pessoaId: string }> }
) {
  const sessao = await requireTenant();
  const { pessoaId: pessoaIdBruto } = await params;
  const pessoaId = Number(pessoaIdBruto);
  if (!Number.isInteger(pessoaId)) notFound();

  const url = new URL(req.url);

  // Período customizado (?de=&ate=) tem prioridade sobre ?mes= — usado
  // pelo botão "Por período" (ver EspelhoPontoBotoes.tsx). Sem meta de
  // horas nesse caso (calcularMetaMinutos é pensado pra mês fechado; um
  // intervalo arbitrário pode cruzar meses ou ser parcial, e arriscar uma
  // proporção errada não vale a pena — o PDF já trata metaMinutos null
  // sem comparação nenhuma).
  const deParam = url.searchParams.get("de");
  const ateParam = url.searchParams.get("ate");
  const periodoValido =
    deParam && ateParam && /^\d{4}-\d{2}-\d{2}$/.test(deParam) && /^\d{4}-\d{2}-\d{2}$/.test(ateParam) && ateParam >= deParam
      ? { de: deParam, ate: ateParam }
      : null;

  const mesParam = url.searchParams.get("mes");
  const mesValido = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesPassadoISO(new Date());
  const [ano, mes] = mesValido.split("-").map(Number);

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    select: {
      tipoVinculo: true,
      cargo: true,
      matriculaInterna: true,
      cargaHorariaSemanalMin: true,
      pessoa: { select: { nome: true, documento: true, pisPasepNit: true, ctpsNumero: true, ctpsSerieUf: true } },
    },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") notFound();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, cnpj: true },
  });

  const inicioPeriodo = periodoValido ? instanteBrasil(periodoValido.de) : instanteBrasil(`${mesValido}-01`);
  const ultimoDiaMes = new Date(ano, mes, 0).getDate();
  const fimPeriodo = periodoValido
    ? new Date(instanteBrasil(periodoValido.ate).getTime() + 24 * 60 * 60 * 1000)
    : new Date(inicioPeriodo.getTime() + ultimoDiaMes * 24 * 60 * 60 * 1000);

  const registros = await prisma.registroPonto.findMany({
    where: { pessoaId, empresaId: sessao.empresaEfetivoId, horaEntrada: { gte: inicioPeriodo, lt: fimPeriodo } },
    orderBy: { horaEntrada: "asc" },
    select: {
      horaEntrada: true,
      entradaIntervalo: true,
      saidaIntervalo: true,
      horaSaida: true,
      minutosTrabalhados: true,
      correcaoSaidaEm: true,
    },
  });

  const linhasPorDia = new Map<string, LinhaEspelhoPonto[]>();
  for (const r of registros) {
    const chave = dataISOBrasil(r.horaEntrada);
    const linha: LinhaEspelhoPonto = {
      data: r.horaEntrada,
      horaEntrada: r.horaEntrada,
      entradaIntervalo: r.entradaIntervalo,
      saidaIntervalo: r.saidaIntervalo,
      horaSaida: r.horaSaida,
      minutosTrabalhados: r.minutosTrabalhados,
      minutosNoturnos: r.horaSaida ? calcularMinutosNoturnos(r.horaEntrada, r.horaSaida) : null,
      encerradoManualmente: r.correcaoSaidaEm !== null,
    };
    linhasPorDia.set(chave, [...(linhasPorDia.get(chave) ?? []), linha]);
  }

  const diasDoMes: Date[] = [];
  if (periodoValido) {
    for (let t = inicioPeriodo.getTime(); t < fimPeriodo.getTime(); t += 24 * 60 * 60 * 1000) {
      diasDoMes.push(new Date(t));
    }
  } else {
    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
      diasDoMes.push(instanteBrasil(`${mesValido}-${String(dia).padStart(2, "0")}`));
    }
  }

  const mesReferenciaLabel = periodoValido
    ? `${formatarDataSemHora(inicioPeriodo)} a ${formatarDataSemHora(new Date(fimPeriodo.getTime() - 24 * 60 * 60 * 1000))}`
    : new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(inicioPeriodo);

  // Meta proporcional só faz sentido pro mês inteiro (?mes=) — período
  // customizado (?de=&ate=) pode cruzar meses ou ser parcial, então fica
  // sem meta (metaMinutos null, o PDF já trata isso sem comparação
  // nenhuma) em vez de arriscar uma proporção errada. Ver
  // calcularMetaMinutos em src/lib/resumo-horas.ts.
  const metaMinutos = periodoValido ? null : calcularMetaMinutos(vinculo.cargaHorariaSemanalMin, ultimoDiaMes);

  const pdfBytes = await gerarPdfEspelhoPonto({
    empresaNome: empresa.nome,
    empresaCnpj: empresa.cnpj,
    pessoaNome: vinculo.pessoa.nome,
    pessoaCpf: formatarCpf(vinculo.pessoa.documento),
    pisPasepNit: vinculo.pessoa.pisPasepNit,
    ctpsNumero: vinculo.pessoa.ctpsNumero,
    ctpsSerieUf: vinculo.pessoa.ctpsSerieUf,
    matriculaInterna: vinculo.matriculaInterna,
    cargo: vinculo.cargo,
    mesReferenciaLabel,
    metaMinutos,
    diasDoMes,
    linhasPorDia,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="espelho-ponto-${sanitizarNomeArquivo(vinculo.pessoa.nome)}-${periodoValido ? `${periodoValido.de}_a_${periodoValido.ate}` : mesValido}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
