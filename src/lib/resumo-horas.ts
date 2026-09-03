import "server-only";
import { prisma } from "@/lib/prisma";
import { horarioEsperadoClt, calcularDesvioPontoClt } from "@/lib/ponto";
import { dataISOBrasil } from "@/lib/data";

export type PeriodoFechado = { inicio: Date; fim: Date; dias: number };

/** Semana passada fechada (segunda a domingo) — nunca a semana ainda em
 * andamento, pra não misturar "quanto já trabalhou até agora" com "quanto
 * trabalhou na semana inteira". `fim` é exclusivo (a segunda-feira desta
 * semana). */
export function semanaPassadaFechada(agora: Date, inicioDaSemanaBrasil: (d: Date) => Date): PeriodoFechado {
  const inicioSemanaAtual = inicioDaSemanaBrasil(agora);
  const inicio = new Date(inicioSemanaAtual.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { inicio, fim: inicioSemanaAtual, dias: 7 };
}

/** Mês passado fechado inteiro — mesmo espírito de semanaPassadaFechada,
 * nunca o mês em andamento. */
export function mesPassadoFechado(
  agora: Date,
  inicioDoMesBrasil: (d: Date) => Date
): PeriodoFechado {
  const inicioMesAtual = inicioDoMesBrasil(agora);
  const ultimoInstanteMesPassado = new Date(inicioMesAtual.getTime() - 1);
  const inicio = inicioDoMesBrasil(ultimoInstanteMesPassado);
  const dias = Math.round((inicioMesAtual.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000));
  return { inicio, fim: inicioMesAtual, dias };
}

/// A cada 7 dias corridos, até 2 dias sem bater ponto é normal (folga —
/// pensa numa escala 5x2). Passar disso, mesmo proporcionalmente num
/// período maior/menor que uma semana, é o que a empresa considera falta
/// (justificada ou não — a contagem não distingue isso, só sinaliza).
const DIAS_FOLGA_NORMAL_POR_SEMANA = 2;

export type ResumoPessoa = {
  pessoaId: number;
  nome: string;
  tipoVinculo: "EXTRA" | "CLT";
  minutosTrabalhados: number;
  /// Meta proporcional ao período (carga semanal escalada pros dias do
  /// período) — null quando a pessoa não tem carga horária configurada,
  /// caso em que não há o que comparar.
  metaMinutos: number | null;
  /// trabalhado - meta. Positivo = hora extra, negativo = hora a menos.
  diferencaMinutos: number | null;
  /// Só CLT — true quando nenhum registro do período teve atraso na
  /// entrada (ver calcularDesvioPontoClt). null pra EXTRA (não se aplica).
  semAtrasoNoPeriodo: boolean | null;
  /// Só CLT — quantos dias corridos do período (contados só a partir da
  /// admissão, se for depois do início do período) a pessoa não bateu
  /// ponto nenhuma vez. null pra EXTRA.
  diasSemBaterPonto: number | null;
  /// Só CLT — diasSemBaterPonto passou do que é considerado folga normal
  /// (ver DIAS_FOLGA_NORMAL_POR_SEMANA, escalado pro tamanho do período).
  /// É só um sinal pro dono avaliar — nunca decide sozinho se caracteriza
  /// falta de verdade nem se afeta bonificação (isso é sempre negociado,
  /// nunca automático). null pra EXTRA.
  possivelFalta: boolean | null;
};

/** Resumo de horas trabalhadas por pessoa (extra + CLT juntos) num período
 * fechado — base do /relatorios/resumo. Compara contra
 * VinculoPessoaEmpresa.cargaHorariaSemanalMin (quando configurada,
 * escalada proporcionalmente pro tamanho do período) pra sinalizar hora
 * extra ou hora a menos, e sinaliza possível falta pro CLT. Extra nunca
 * aparece com 0 turnos (não trabalhar numa semana não é anomalia pra quem
 * é por natureza sob demanda) — CLT ativo sempre aparece, mesmo com 0
 * registros, porque aí é exatamente o caso mais importante de sinalizar. */
export async function calcularResumoHoras(
  empresaId: number,
  periodo: PeriodoFechado
): Promise<ResumoPessoa[]> {
  const [turnos, registros, vinculos, empresaConfig] = await Promise.all([
    prisma.turno.findMany({
      where: {
        empresaId,
        horaEntrada: { gte: periodo.inicio, lt: periodo.fim },
        minutosArredondados: { not: null },
      },
      select: { pessoaId: true, minutosArredondados: true, pessoa: { select: { nome: true } } },
    }),
    prisma.registroPonto.findMany({
      where: { empresaId, horaEntrada: { gte: periodo.inicio, lt: periodo.fim } },
      select: {
        pessoaId: true,
        horaEntrada: true,
        horaSaida: true,
        minutosTrabalhados: true,
        status: true,
        pessoa: { select: { nome: true } },
      },
    }),
    prisma.vinculoPessoaEmpresa.findMany({
      where: { empresaId },
      select: {
        pessoaId: true,
        tipoVinculo: true,
        ativo: true,
        cargaHorariaSemanalMin: true,
        escalaTrabalho: true,
        escalaTurno: true,
        horarioEntradaMin: true,
        horarioSaidaMin: true,
        dataAdmissao: true,
        pessoa: { select: { nome: true } },
      },
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: {
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
      },
    }),
  ]);

  const vinculoPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v]));

  const porPessoa = new Map<
    number,
    {
      nome: string;
      tipoVinculo: "EXTRA" | "CLT";
      minutos: number;
      semAtraso: boolean;
      diasTrabalhados: Set<string>;
    }
  >();

  for (const t of turnos) {
    const atual = porPessoa.get(t.pessoaId) ?? {
      nome: t.pessoa.nome,
      tipoVinculo: "EXTRA" as const,
      minutos: 0,
      semAtraso: true,
      diasTrabalhados: new Set<string>(),
    };
    atual.minutos += t.minutosArredondados ?? 0;
    porPessoa.set(t.pessoaId, atual);
  }

  for (const r of registros) {
    const atual = porPessoa.get(r.pessoaId) ?? {
      nome: r.pessoa.nome,
      tipoVinculo: "CLT" as const,
      minutos: 0,
      semAtraso: true,
      diasTrabalhados: new Set<string>(),
    };
    atual.tipoVinculo = "CLT";
    atual.diasTrabalhados.add(dataISOBrasil(r.horaEntrada));
    if (r.status !== "CONCLUIDO") {
      porPessoa.set(r.pessoaId, atual);
      continue; // conta o dia como trabalhado, mas sem minutos/desvio pra somar ainda (aberto ou pendente de correção)
    }
    atual.minutos += r.minutosTrabalhados ?? 0;

    const vinculo = vinculoPorPessoa.get(r.pessoaId);
    const esperado = horarioEsperadoClt(
      vinculo?.escalaTrabalho ?? null,
      vinculo?.escalaTurno ?? null,
      vinculo?.horarioEntradaMin ?? null,
      vinculo?.horarioSaidaMin ?? null,
      empresaConfig
    );
    const { atrasoEntradaMin } = calcularDesvioPontoClt(r.horaEntrada, r.horaSaida, esperado);
    if (atrasoEntradaMin !== null) atual.semAtraso = false;

    porPessoa.set(r.pessoaId, atual);
  }

  // CLT ativo sempre entra na conta, mesmo com zero registros — é
  // exatamente o caso de "sumiu a semana inteira" que mais importa pegar.
  for (const v of vinculos) {
    if (v.tipoVinculo !== "CLT" || !v.ativo) continue;
    if (!porPessoa.has(v.pessoaId)) {
      porPessoa.set(v.pessoaId, {
        nome: v.pessoa.nome,
        tipoVinculo: "CLT",
        minutos: 0,
        semAtraso: true,
        diasTrabalhados: new Set<string>(),
      });
    }
  }

  const resultado: ResumoPessoa[] = [...porPessoa.entries()].map(([pessoaId, dados]) => {
    const vinculo = vinculoPorPessoa.get(pessoaId);
    const cargaSemanalMin = vinculo?.cargaHorariaSemanalMin ?? null;
    const metaMinutos = cargaSemanalMin !== null ? Math.round((cargaSemanalMin * periodo.dias) / 7) : null;

    let diasSemBaterPonto: number | null = null;
    let possivelFalta: boolean | null = null;
    if (dados.tipoVinculo === "CLT") {
      const inicioEfetivo =
        vinculo?.dataAdmissao && vinculo.dataAdmissao > periodo.inicio ? vinculo.dataAdmissao : periodo.inicio;
      const diasEfetivos = Math.max(
        0,
        Math.round((periodo.fim.getTime() - inicioEfetivo.getTime()) / (24 * 60 * 60 * 1000))
      );
      diasSemBaterPonto = Math.max(0, diasEfetivos - dados.diasTrabalhados.size);
      const limiteFolga = Math.round((DIAS_FOLGA_NORMAL_POR_SEMANA * diasEfetivos) / 7);
      possivelFalta = diasSemBaterPonto > limiteFolga;
    }

    return {
      pessoaId,
      nome: dados.nome,
      tipoVinculo: dados.tipoVinculo,
      minutosTrabalhados: dados.minutos,
      metaMinutos,
      diferencaMinutos: metaMinutos !== null ? dados.minutos - metaMinutos : null,
      semAtrasoNoPeriodo: dados.tipoVinculo === "CLT" ? dados.semAtraso : null,
      diasSemBaterPonto,
      possivelFalta,
    };
  });

  return resultado.sort((a, b) => b.minutosTrabalhados - a.minutosTrabalhados);
}
