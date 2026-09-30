import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarCpf } from "@/lib/cpf";
import { instanteBrasil, dataISOBrasil, formatarDataSemHora } from "@/lib/data";
import {
  calcularMinutosNoturnos,
  horarioEsperadoClt,
  horarioEsperadoDoRegistro,
  calcularDesvioPontoClt,
  calcularHoraExtraPontoClt,
} from "@/lib/ponto";
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
      escalaTrabalho: true,
      escalaTurno: true,
      horarioEntradaMin: true,
      horarioSaidaMin: true,
      ultimasFeriasGozadasEm: true,
      feriasQuantidadeDias: true,
      pessoa: { select: { nome: true, documento: true, pisPasepNit: true, ctpsNumero: true, ctpsSerieUf: true } },
    },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") notFound();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: {
      nome: true,
      cnpj: true,
      horarioEntrada5x2Min: true,
      horarioSaida5x2Min: true,
      horarioEntrada5x2NoiteMin: true,
      horarioSaida5x2NoiteMin: true,
      horarioEntrada6x1Min: true,
      horarioSaida6x1Min: true,
      horarioEntrada6x1NoiteMin: true,
      horarioSaida6x1NoiteMin: true,
      horarioEntrada12x36Min: true,
      horarioSaida12x36Min: true,
      horarioEntrada12x36NoiteMin: true,
      horarioSaida12x36NoiteMin: true,
      horarioInicioDiaMin: true,
      horarioInicioNoiteMin: true,
    },
  });

  // Mesma conta já usada no histórico de ponto da tela de funcionário
  // (ver src/app/funcionarios/[id]/page.tsx) — horário esperado é fixo
  // pra pessoa (escala + turno + eventual override individual), não
  // recalculado por dia. Null quando não há escala nem override
  // configurado, caso em que nenhuma linha ganha atraso/saída
  // antecipada/hora extra (ver horarioConfigurado abaixo).
  const horarioEsperado = horarioEsperadoClt(
    vinculo.escalaTrabalho,
    vinculo.escalaTurno,
    vinculo.horarioEntradaMin,
    vinculo.horarioSaidaMin,
    empresa
  );

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
      trocaTurnoOficialHoje: true,
    },
  });

  const linhasPorDia = new Map<string, LinhaEspelhoPonto[]>();
  for (const r of registros) {
    const chave = dataISOBrasil(r.horaEntrada);
    const horarioEsperadoDoDia = horarioEsperadoDoRegistro(r, vinculo, empresa);
    const linha: LinhaEspelhoPonto = {
      data: r.horaEntrada,
      horaEntrada: r.horaEntrada,
      entradaIntervalo: r.entradaIntervalo,
      saidaIntervalo: r.saidaIntervalo,
      horaSaida: r.horaSaida,
      minutosTrabalhados: r.minutosTrabalhados,
      minutosNoturnos: r.horaSaida ? calcularMinutosNoturnos(r.horaEntrada, r.horaSaida) : null,
      encerradoManualmente: r.correcaoSaidaEm !== null,
      ...calcularDesvioPontoClt(r.horaEntrada, r.horaSaida, horarioEsperadoDoDia),
      ...calcularHoraExtraPontoClt(r.horaEntrada, r.horaSaida, horarioEsperadoDoDia),
    };
    linhasPorDia.set(chave, [...(linhasPorDia.get(chave) ?? []), linha]);
  }

  // Dias sem nenhum registro que caem dentro das últimas férias
  // registradas (ver VinculoPessoaEmpresa.ultimasFeriasGozadasEm/
  // feriasQuantidadeDias, mesmos campos do FeriasCard em
  // /funcionarios/[id]) — mostrados como "Férias" no PDF em vez de ficar
  // em branco. Comparação por string ISO (não por Date) porque
  // ultimasFeriasGozadasEm é @db.Date (meia-noite UTC) e os dias do
  // período são instanteBrasil (meia-noite Brasília) — bases de fuso
  // diferentes, string YYYY-MM-DD evita comparar timestamp com timestamp.
  const diasFeriasISO = new Set<string>();
  if (vinculo.ultimasFeriasGozadasEm && vinculo.feriasQuantidadeDias) {
    const inicioFeriasISO = vinculo.ultimasFeriasGozadasEm.toISOString().slice(0, 10);
    const fimFerias = new Date(
      vinculo.ultimasFeriasGozadasEm.getTime() + vinculo.feriasQuantidadeDias * 24 * 60 * 60 * 1000
    );
    const fimFeriasISO = fimFerias.toISOString().slice(0, 10);
    for (let t = inicioPeriodo.getTime(); t < fimPeriodo.getTime(); t += 24 * 60 * 60 * 1000) {
      const diaISO = dataISOBrasil(new Date(t));
      if (diaISO >= inicioFeriasISO && diaISO < fimFeriasISO) diasFeriasISO.add(diaISO);
    }
  }

  // Mesma ideia acima, agora pros atestados/licenças registrados (ver
  // AtestadoClt, src/app/funcionarios/[id]/AtestadosCard.tsx) — dia sem
  // registro dentro do período de algum atestado aparece como "Atestado"
  // em vez de ficar em branco. Diferente de férias (só a última
  // registrada), aqui busca TODOS os atestados que se sobrepõem ao
  // período pedido, já que pode haver mais de um no mesmo mês.
  const diasAtestadoISO = new Set<string>();
  const atestados = await prisma.atestadoClt.findMany({
    where: {
      pessoaId,
      empresaId: sessao.empresaEfetivoId,
      dataInicio: { lt: fimPeriodo },
      dataFim: { gte: inicioPeriodo },
    },
    select: { dataInicio: true, dataFim: true },
  });
  for (const at of atestados) {
    const inicioAtestadoISO = at.dataInicio.toISOString().slice(0, 10);
    const fimAtestadoISO = new Date(at.dataFim.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (let t = inicioPeriodo.getTime(); t < fimPeriodo.getTime(); t += 24 * 60 * 60 * 1000) {
      const diaISO = dataISOBrasil(new Date(t));
      if (diaISO >= inicioAtestadoISO && diaISO < fimAtestadoISO) diasAtestadoISO.add(diaISO);
    }
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
    horarioConfigurado: horarioEsperado !== null,
    diasDoMes,
    linhasPorDia,
    diasFeriasISO,
    diasAtestadoISO,
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="espelho-ponto-${sanitizarNomeArquivo(vinculo.pessoa.nome)}-${periodoValido ? `${periodoValido.de}_a_${periodoValido.ate}` : mesValido}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
