import { prisma } from "@/lib/prisma";
import { inicioDoDiaBrasil, dataISOBrasil, instanteBrasil } from "@/lib/data";
import { classificarTurno, type TipoTurno } from "@/lib/turno";
import { horarioEsperadoClt, saidaEsperadaClt } from "@/lib/ponto";
import { buscarSaldoAsaas } from "@/lib/pagamentos/asaas-deposito";
import type { ModoPagamento, FrequenciaPagamento, StatusTurno, Sexo } from "@/generated/prisma/enums";

/// Porte completo da lógica de dados de src/app/dashboard/page.tsx (v1,
/// NÃO tocado) — usado só pela v2 (src/app/v2/dashboard/page.tsx). Os
/// tipos/funções abaixo são a mesma coisa que já existe lá dentro
/// (inline, não exportada); copiados aqui pra v2 poder consumir sem
/// duplicar risco de mexer no v1. Uma futura limpeza (v1 passar a chamar
/// esta mesma função) fica pra depois.

type StatusPagamentoResumo = "PAGO" | "PENDENTE" | "ERRO";

export type ResumoPessoaTurno =
  | {
      origem: "EXTRA";
      pessoaId: number;
      nome: string;
      turnos: number;
      valorTotal: number;
      primeiraEntrada: Date;
      ultimaSaida: Date;
      modoPagamento: ModoPagamento;
      frequencia: FrequenciaPagamento;
      statusPagamento: StatusPagamentoResumo;
      origemPagamento: "AUTOMATICO" | "MANUAL" | "MISTO";
      tipoTurno: TipoTurno | "DOBRADO";
    }
  | {
      origem: "CLT";
      pessoaId: number;
      nome: string;
      turnos: number;
      primeiraEntrada: Date;
      ultimaSaida: Date;
      tipoTurno: TipoTurno;
    };

export type ItemEmTurnoDashboard =
  | {
      origem: "EXTRA";
      id: number;
      pessoaId: number;
      nome: string;
      temFoto: boolean;
      sexo: Sexo | null;
      horaEntrada: Date;
      funcaoNome: string;
      modoPagamentoAplicado: ModoPagamento;
      frequenciaPagamentoAplicada: FrequenciaPagamento;
      tipoTurno: TipoTurno | "DOBRADO";
      conflitoDesde: Date | null;
      alertaHorario: { cutoff: Date; podeDobrar: boolean } | null;
    }
  | {
      origem: "CLT";
      id: number;
      pessoaId: number;
      nome: string;
      temFoto: boolean;
      sexo: Sexo | null;
      horaEntrada: Date;
      emIntervalo: boolean;
      conflitoDesde: Date | null;
      alertaHorario: { cutoff: Date; podeDobrar: boolean } | null;
    };

export type DadosDashboard = {
  turnosHoje: number;
  pagamentosPendentes: { quantidade: number; total: number };
  totalFuncoes: number;
  totalTotens: number;
  itensEmTurno: ItemEmTurnoDashboard[];
  resumoHoje: [string, ResumoPessoaTurno][];
  resumoOntem: [string, ResumoPessoaTurno][];
  valorTotalHoje: number;
  valorTotalOntem: number;
  /// null = conta Asaas não conectada (não mostra o atalho) OU falha
  /// momentânea ao consultar — ver buscarSaldoAsaas.
  saldoAsaas: number | null;
};

export async function buscarDadosDashboard(empresaId: number): Promise<DadosDashboard> {
  const hoje = inicioDoDiaBrasil(new Date());
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

  const [
    turnosHoje,
    pagamentosPendentesAgregado,
    totalFuncoes,
    totalTotens,
    emTurnoAgora,
    emPontoAgoraClt,
    turnosFechadosRecentes,
    registrosPontoFechadosRecentes,
    empresaConfig,
    contaAsaas,
  ] = await Promise.all([
    prisma.turno.count({ where: { empresaId, criadoEm: { gte: hoje } } }),
    prisma.pagamento.aggregate({
      where: { status: { in: ["PENDENTE", "FALHOU"] }, turno: { empresaId } },
      _count: true,
      _sum: { valor: true },
    }),
    prisma.funcao.count({ where: { empresaId } }),
    prisma.totem.count({ where: { empresaId } }),
    prisma.turno.findMany({
      where: { empresaId, status: "ABERTO" },
      orderBy: { horaEntrada: "asc" },
      select: {
        id: true,
        horaEntrada: true,
        modoPagamentoAplicado: true,
        frequenciaPagamentoAplicada: true,
        turnoDobrado: true,
        pessoa: { select: { id: true, nome: true, fotoPerfilUrl: true, sexo: true } },
        funcao: { select: { nome: true } },
      },
    }),
    prisma.registroPonto.findMany({
      where: { empresaId, status: "ABERTO" },
      orderBy: { horaEntrada: "asc" },
      select: {
        id: true,
        horaEntrada: true,
        entradaIntervalo: true,
        saidaIntervalo: true,
        pessoa: { select: { id: true, nome: true, fotoPerfilUrl: true, sexo: true } },
      },
    }),
    prisma.turno.findMany({
      where: { empresaId, horaEntrada: { gte: ontem }, horaSaida: { not: null } },
      select: {
        valorTotal: true,
        horaEntrada: true,
        horaSaida: true,
        modoPagamentoAplicado: true,
        frequenciaPagamentoAplicada: true,
        turnoDobrado: true,
        status: true,
        pessoa: { select: { id: true, nome: true } },
        pagamento: { select: { pagoAutomaticamente: true } },
      },
    }),
    prisma.registroPonto.findMany({
      where: { empresaId, horaEntrada: { gte: ontem }, horaSaida: { not: null } },
      select: { horaEntrada: true, horaSaida: true, pessoa: { select: { id: true, nome: true } } },
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: {
        horarioInicioDiaMin: true,
        horarioInicioNoiteMin: true,
        horarioFechamentoDiaMin: true,
        horarioFechamentoNoiteMin: true,
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
    prisma.contaAsaasEmpresa.findUnique({ where: { empresaId }, select: { empresaId: true } }),
  ]);

  // buscarSaldoAsaas chama a API da Asaas ao vivo — só vale a pena depois
  // de confirmar que a empresa tem conta conectada (contaAsaas acima),
  // por isso fica fora do Promise.all principal (não dá pra saber se vale
  // chamar antes de esperar aquela query voltar).
  const saldoAsaas = contaAsaas ? await buscarSaldoAsaas(empresaId) : null;

  const pessoaIds = [
    ...emTurnoAgora.map((t) => t.pessoa.id),
    ...turnosFechadosRecentes.map((t) => t.pessoa.id),
    ...registrosPontoFechadosRecentes.map((r) => r.pessoa.id),
  ];
  const pessoaIdsEmTurno = [...emTurnoAgora.map((t) => t.pessoa.id), ...emPontoAgoraClt.map((r) => r.pessoa.id)];

  const [vinculos, outrosTurnos, outrosRegistros] = await Promise.all([
    prisma.vinculoPessoaEmpresa.findMany({
      where: { empresaId, pessoaId: { in: pessoaIds } },
      select: {
        pessoaId: true,
        turnoPredefinido: true,
        escalaTrabalho: true,
        escalaTurno: true,
        horarioEntradaMin: true,
        horarioSaidaMin: true,
      },
    }),
    pessoaIdsEmTurno.length
      ? prisma.turno.findMany({
          where: { pessoaId: { in: pessoaIdsEmTurno }, empresaId: { not: empresaId }, horaEntrada: { gte: ontem } },
          select: { pessoaId: true, horaEntrada: true },
        })
      : Promise.resolve([]),
    pessoaIdsEmTurno.length
      ? prisma.registroPonto.findMany({
          where: { pessoaId: { in: pessoaIdsEmTurno }, empresaId: { not: empresaId }, horaEntrada: { gte: ontem } },
          select: { pessoaId: true, horaEntrada: true },
        })
      : Promise.resolve([]),
  ]);
  const turnoPredefinidoPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v.turnoPredefinido]));
  const vinculoCltPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v]));

  function tipoDoTurno(pessoaId: number, horaEntrada: Date, dobrado: boolean): TipoTurno | "DOBRADO" {
    if (dobrado) return "DOBRADO";
    return classificarTurno(
      horaEntrada,
      turnoPredefinidoPorPessoa.get(pessoaId) ?? "LIVRE",
      empresaConfig.horarioInicioDiaMin,
      empresaConfig.horarioInicioNoiteMin
    );
  }

  function alertaHorarioNormal(
    horaEntrada: Date,
    dobrado: boolean,
    tipo: TipoTurno | "DOBRADO"
  ): { cutoff: Date; podeDobrar: boolean } | null {
    if (dobrado || tipo === "DOBRADO") return null;
    const dataISO = dataISOBrasil(horaEntrada);
    const cutoffMin = tipo === "DIA" ? empresaConfig.horarioFechamentoDiaMin : empresaConfig.horarioFechamentoNoiteMin;
    let cutoff = instanteBrasil(dataISO, cutoffMin);
    if (cutoff <= horaEntrada) cutoff = new Date(cutoff.getTime() + 24 * 60 * 60_000);
    if (cutoff > new Date()) return null;
    return { cutoff, podeDobrar: tipo === "DIA" };
  }

  // Mesmo aviso acima, só que pro ponto de CLT: o corte certo é o HORÁRIO
  // DE SAÍDA DA PRÓPRIA PESSOA (VinculoPessoaEmpresa.horarioSaidaMin, ou o
  // padrão da escala dela — ver horarioEsperadoClt em src/lib/ponto.ts),
  // NUNCA o horário de fechamento genérico do turno EXTRA (dia/noite) da
  // empresa usado acima — são conceitos diferentes que hoje moram nos
  // mesmos nomes de campo por coincidência.
  function alertaHorarioNormalClt(pessoaId: number, horaEntrada: Date): { cutoff: Date; podeDobrar: boolean } | null {
    const vinculo = vinculoCltPorPessoa.get(pessoaId);
    if (!vinculo) return null;
    const esperado = horarioEsperadoClt(
      vinculo.escalaTrabalho,
      vinculo.escalaTurno,
      vinculo.horarioEntradaMin,
      vinculo.horarioSaidaMin,
      empresaConfig
    );
    const cutoff = saidaEsperadaClt(horaEntrada, esperado);
    if (!cutoff || cutoff > new Date()) return null;
    return { cutoff, podeDobrar: false };
  }

  const outrosPorPessoa = new Map<number, Date[]>();
  for (const o of [...outrosTurnos, ...outrosRegistros]) {
    const atual = outrosPorPessoa.get(o.pessoaId) ?? [];
    atual.push(o.horaEntrada);
    outrosPorPessoa.set(o.pessoaId, atual);
  }
  function conflitoDesde(pessoaId: number, horaEntradaAqui: Date): Date | null {
    const outras = (outrosPorPessoa.get(pessoaId) ?? []).filter((d) => d > horaEntradaAqui);
    if (outras.length === 0) return null;
    return outras.reduce((a, b) => (a < b ? a : b));
  }

  const itensEmTurno: ItemEmTurnoDashboard[] = [
    ...emTurnoAgora.map((t): ItemEmTurnoDashboard => {
      const tipoTurno = tipoDoTurno(t.pessoa.id, t.horaEntrada, t.turnoDobrado);
      return {
        origem: "EXTRA",
        id: t.id,
        pessoaId: t.pessoa.id,
        nome: t.pessoa.nome,
        temFoto: Boolean(t.pessoa.fotoPerfilUrl),
        sexo: t.pessoa.sexo,
        horaEntrada: t.horaEntrada,
        funcaoNome: t.funcao.nome,
        modoPagamentoAplicado: t.modoPagamentoAplicado,
        frequenciaPagamentoAplicada: t.frequenciaPagamentoAplicada,
        tipoTurno,
        conflitoDesde: conflitoDesde(t.pessoa.id, t.horaEntrada),
        alertaHorario: alertaHorarioNormal(t.horaEntrada, t.turnoDobrado, tipoTurno),
      };
    }),
    ...emPontoAgoraClt.map((r): ItemEmTurnoDashboard => {
      return {
        origem: "CLT",
        id: r.id,
        pessoaId: r.pessoa.id,
        nome: r.pessoa.nome,
        temFoto: Boolean(r.pessoa.fotoPerfilUrl),
        sexo: r.pessoa.sexo,
        horaEntrada: r.horaEntrada,
        emIntervalo: r.entradaIntervalo !== null && r.saidaIntervalo === null,
        conflitoDesde: conflitoDesde(r.pessoa.id, r.horaEntrada),
        alertaHorario: alertaHorarioNormalClt(r.pessoa.id, r.horaEntrada),
      };
    }),
  ].sort((a, b) => a.horaEntrada.getTime() - b.horaEntrada.getTime());

  function combinarStatusPagamento(acumulado: StatusPagamentoResumo, status: StatusTurno): StatusPagamentoResumo {
    if (acumulado === "ERRO" || status === "ERRO_PAGAMENTO") return "ERRO";
    if (acumulado === "PENDENTE" || status !== "PAGO") return "PENDENTE";
    return "PAGO";
  }

  function statusPagamentoDoTurno(status: StatusTurno): StatusPagamentoResumo {
    if (status === "ERRO_PAGAMENTO") return "ERRO";
    return status === "PAGO" ? "PAGO" : "PENDENTE";
  }

  function agregarFechados(
    turnosExtra: typeof turnosFechadosRecentes,
    registrosClt: typeof registrosPontoFechadosRecentes
  ): [string, ResumoPessoaTurno][] {
    const mapa = new Map<string, ResumoPessoaTurno>();

    for (const turno of turnosExtra) {
      if (!turno.horaSaida) continue;
      const tipoTurno = tipoDoTurno(turno.pessoa.id, turno.horaEntrada, turno.turnoDobrado);
      const chave = `EXTRA-${turno.pessoa.id}-${tipoTurno}`;
      const origemTurno: "AUTOMATICO" | "MANUAL" = turno.pagamento?.pagoAutomaticamente ? "AUTOMATICO" : "MANUAL";
      const atual = mapa.get(chave);
      if (atual && atual.origem === "EXTRA") {
        atual.turnos += 1;
        atual.valorTotal += turno.valorTotal !== null ? Number(turno.valorTotal) : 0;
        if (turno.horaEntrada < atual.primeiraEntrada) atual.primeiraEntrada = turno.horaEntrada;
        if (turno.horaSaida > atual.ultimaSaida) atual.ultimaSaida = turno.horaSaida;
        if (turno.modoPagamentoAplicado === "DIARIA") atual.modoPagamento = "DIARIA";
        if (turno.frequenciaPagamentoAplicada === "SEMANAL") atual.frequencia = "SEMANAL";
        atual.statusPagamento = combinarStatusPagamento(atual.statusPagamento, turno.status);
        if (atual.origemPagamento !== origemTurno) atual.origemPagamento = "MISTO";
      } else {
        mapa.set(chave, {
          origem: "EXTRA",
          pessoaId: turno.pessoa.id,
          nome: turno.pessoa.nome,
          turnos: 1,
          valorTotal: turno.valorTotal !== null ? Number(turno.valorTotal) : 0,
          primeiraEntrada: turno.horaEntrada,
          ultimaSaida: turno.horaSaida,
          modoPagamento: turno.modoPagamentoAplicado,
          statusPagamento: statusPagamentoDoTurno(turno.status),
          origemPagamento: origemTurno,
          frequencia: turno.frequenciaPagamentoAplicada,
          tipoTurno,
        });
      }
    }

    for (const registro of registrosClt) {
      if (!registro.horaSaida) continue;
      const tipoTurno = tipoDoTurno(registro.pessoa.id, registro.horaEntrada, false) as TipoTurno;
      const chave = `CLT-${registro.pessoa.id}-${tipoTurno}`;
      const atual = mapa.get(chave);
      if (atual && atual.origem === "CLT") {
        atual.turnos += 1;
        if (registro.horaEntrada < atual.primeiraEntrada) atual.primeiraEntrada = registro.horaEntrada;
        if (registro.horaSaida > atual.ultimaSaida) atual.ultimaSaida = registro.horaSaida;
      } else {
        mapa.set(chave, {
          origem: "CLT",
          pessoaId: registro.pessoa.id,
          nome: registro.pessoa.nome,
          turnos: 1,
          primeiraEntrada: registro.horaEntrada,
          ultimaSaida: registro.horaSaida,
          tipoTurno,
        });
      }
    }

    return [...mapa.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome));
  }

  const turnosDeHoje = turnosFechadosRecentes.filter((t) => t.horaEntrada >= hoje);
  const turnosDeOntem = turnosFechadosRecentes.filter((t) => t.horaEntrada < hoje);
  const registrosDeHoje = registrosPontoFechadosRecentes.filter((r) => r.horaEntrada >= hoje);
  const registrosDeOntem = registrosPontoFechadosRecentes.filter((r) => r.horaEntrada < hoje);
  const resumoHoje = agregarFechados(turnosDeHoje, registrosDeHoje);
  const resumoOntem = agregarFechados(turnosDeOntem, registrosDeOntem);
  const valorTotalHoje = resumoHoje.reduce((soma, [, r]) => soma + (r.origem === "EXTRA" ? r.valorTotal : 0), 0);
  const valorTotalOntem = resumoOntem.reduce((soma, [, r]) => soma + (r.origem === "EXTRA" ? r.valorTotal : 0), 0);

  return {
    turnosHoje,
    pagamentosPendentes: {
      quantidade: pagamentosPendentesAgregado._count,
      total: Number(pagamentosPendentesAgregado._sum.valor ?? 0),
    },
    totalFuncoes,
    totalTotens,
    itensEmTurno,
    resumoHoje,
    resumoOntem,
    valorTotalHoje,
    valorTotalOntem,
    saldoAsaas,
  };
}
