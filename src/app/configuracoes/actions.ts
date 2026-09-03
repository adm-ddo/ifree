"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { textoParaTermos } from "@/lib/termos";
import { paraMinutosHorario } from "@/lib/ponto";

export type ConfiguracoesState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarConfiguracoes(
  _prev: ConfiguracoesState,
  formData: FormData
): Promise<ConfiguracoesState> {
  const sessao = await requireTenant();

  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nome || !cnpj) {
    return { erro: "Preencha nome e CNPJ." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { nome, cnpj, endereco: endereco || null },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/", "layout");
  return { sucesso: true };
}

export type SlaEticaState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarSlaEtica(
  _prev: SlaEticaState,
  formData: FormData
): Promise<SlaEticaState> {
  const sessao = await requireTenant();

  const dias = Number(formData.get("slaDenunciaDias"));
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    return { erro: "Informe um número de dias entre 1 e 365." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { slaDenunciaDias: dias },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type TermosState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarTermosContrato(
  _prev: TermosState,
  formData: FormData
): Promise<TermosState> {
  const sessao = await requireTenant();

  const texto = String(formData.get("termos") ?? "").trim();
  if (textoParaTermos(texto).length === 0) {
    return { erro: "Escreva pelo menos um parágrafo de termo." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { termosContrato: texto },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

/** Apaga o texto personalizado e volta a usar o padrão do sistema. */
export async function restaurarTermosPadrao(): Promise<TermosState> {
  const sessao = await requireTenant();

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { termosContrato: null },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type PausaState = { erro?: string; sucesso?: boolean } | undefined;

const MODOS_PAUSA_VALIDOS = ["NENHUMA", "AUTOMATICA_30", "AUTOMATICA_60"] as const;

export async function atualizarModoPausa(
  _prev: PausaState,
  formData: FormData
): Promise<PausaState> {
  const sessao = await requireTenant();

  const modoPausaDia = String(formData.get("modoPausaDia") ?? "");
  const modoPausaNoite = String(formData.get("modoPausaNoite") ?? "");
  if (
    !MODOS_PAUSA_VALIDOS.includes(modoPausaDia as (typeof MODOS_PAUSA_VALIDOS)[number]) ||
    !MODOS_PAUSA_VALIDOS.includes(modoPausaNoite as (typeof MODOS_PAUSA_VALIDOS)[number])
  ) {
    return { erro: "Selecione uma opção válida." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      modoPausaDia: modoPausaDia as (typeof MODOS_PAUSA_VALIDOS)[number],
      modoPausaNoite: modoPausaNoite as (typeof MODOS_PAUSA_VALIDOS)[number],
    },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type IntervaloCltState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarIntervaloClt(
  _prev: IntervaloCltState,
  formData: FormData
): Promise<IntervaloCltState> {
  const sessao = await requireTenant();

  const funcionariosBaterIntervalo = formData.get("funcionariosBaterIntervalo") === "on";

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { funcionariosBaterIntervalo },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type DiariaState = { erro?: string; sucesso?: boolean } | undefined;

/** Faixas em horas (convertidas pra minutos, unidade usada no banco) que
 * definem quanto da diária um freelancer em modo DIARIA recebe. */
export async function atualizarLimiaresDiaria(
  _prev: DiariaState,
  formData: FormData
): Promise<DiariaState> {
  const sessao = await requireTenant();

  const horasMeia = Number(String(formData.get("limiarMeiaHoras") ?? "").replace(",", "."));
  const horasCompleta = Number(
    String(formData.get("limiarCompletaHoras") ?? "").replace(",", ".")
  );

  if (!Number.isFinite(horasMeia) || horasMeia <= 0) {
    return { erro: "Informe um número de horas válido pra faixa de meia diária." };
  }
  if (!Number.isFinite(horasCompleta) || horasCompleta <= horasMeia) {
    return { erro: "A faixa de diária completa precisa ser maior que a de meia diária." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      diariaLimiarMeiaMin: Math.round(horasMeia * 60),
      diariaLimiarCompletaMin: Math.round(horasCompleta * 60),
    },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type HorarioFechamentoState = { erro?: string; sucesso?: boolean } | undefined;

/** Início e fim de cada turno (dia/noite) — início decide a classificação
 * de quem não tem turno fixo (ver src/lib/turno.ts:classificarTurno), fim
 * é o horaSaida usado pelo cron de fechamento automático
 * (src/lib/fechamento-automatico.ts) quando ninguém bateu saída. */
export async function atualizarHorarioFechamento(
  _prev: HorarioFechamentoState,
  formData: FormData
): Promise<HorarioFechamentoState> {
  const sessao = await requireTenant();

  const horarioInicioDiaMin = paraMinutosHorario(String(formData.get("horarioInicioDia") ?? ""));
  const horarioInicioNoiteMin = paraMinutosHorario(String(formData.get("horarioInicioNoite") ?? ""));
  const horarioFechamentoDiaMin = paraMinutosHorario(String(formData.get("horarioFechamentoDia") ?? ""));
  const horarioFechamentoNoiteMin = paraMinutosHorario(String(formData.get("horarioFechamentoNoite") ?? ""));
  if (
    horarioInicioDiaMin === null ||
    horarioInicioNoiteMin === null ||
    horarioFechamentoDiaMin === null ||
    horarioFechamentoNoiteMin === null
  ) {
    return { erro: "Informe os quatro horários válidos (HH:MM)." };
  }
  if (horarioInicioDiaMin >= horarioInicioNoiteMin) {
    return { erro: "O início do turno do dia precisa ser antes do início do turno da noite." };
  }
  if (horarioFechamentoDiaMin >= horarioFechamentoNoiteMin) {
    return { erro: "O fim do turno do dia precisa ser antes do fim do turno da noite." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { horarioInicioDiaMin, horarioInicioNoiteMin, horarioFechamentoDiaMin, horarioFechamentoNoiteMin },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type HorarioEscalaCltState = { erro?: string; sucesso?: boolean } | undefined;

/** Horário padrão de entrada/saída por escala CLT (5x2, 6x1, 12x36) — cada
 * par é opcional independente dos outros (uma empresa pode só ter gente na
 * 6x1 e nunca preencher os outros dois). OUTRA não aparece aqui de
 * propósito, ver comentário no schema. Uma pessoa específica pode
 * sobrescrever isso em /funcionarios/[id] (ver atualizarSalarioEscala).
 * Usado por horarioEsperadoClt (src/lib/ponto.ts) pra comparar contra o
 * ponto batido de verdade. */
export async function atualizarHorarioEscalaClt(
  _prev: HorarioEscalaCltState,
  formData: FormData
): Promise<HorarioEscalaCltState> {
  const sessao = await requireTenant();

  function par(entradaCampo: string, saidaCampo: string): [number | null, number | null] | { erro: string } {
    const entradaBruta = String(formData.get(entradaCampo) ?? "").trim();
    const saidaBruta = String(formData.get(saidaCampo) ?? "").trim();
    if (!entradaBruta && !saidaBruta) return [null, null];
    const entrada = paraMinutosHorario(entradaBruta);
    const saida = paraMinutosHorario(saidaBruta);
    if (entrada === null || saida === null) {
      return { erro: "Preencha entrada e saída juntas (ou deixe as duas em branco)." };
    }
    return [entrada, saida];
  }

  const cincoXDois = par("horarioEntrada5x2", "horarioSaida5x2");
  if ("erro" in cincoXDois) return cincoXDois;
  const cincoXDoisNoite = par("horarioEntrada5x2Noite", "horarioSaida5x2Noite");
  if ("erro" in cincoXDoisNoite) return cincoXDoisNoite;
  const seisXUm = par("horarioEntrada6x1", "horarioSaida6x1");
  if ("erro" in seisXUm) return seisXUm;
  const seisXUmNoite = par("horarioEntrada6x1Noite", "horarioSaida6x1Noite");
  if ("erro" in seisXUmNoite) return seisXUmNoite;
  const dozeXTrintaSeis = par("horarioEntrada12x36", "horarioSaida12x36");
  if ("erro" in dozeXTrintaSeis) return dozeXTrintaSeis;
  const dozeXTrintaSeisNoite = par("horarioEntrada12x36Noite", "horarioSaida12x36Noite");
  if ("erro" in dozeXTrintaSeisNoite) return dozeXTrintaSeisNoite;

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      horarioEntrada5x2Min: cincoXDois[0],
      horarioSaida5x2Min: cincoXDois[1],
      horarioEntrada5x2NoiteMin: cincoXDoisNoite[0],
      horarioSaida5x2NoiteMin: cincoXDoisNoite[1],
      horarioEntrada6x1Min: seisXUm[0],
      horarioSaida6x1Min: seisXUm[1],
      horarioEntrada6x1NoiteMin: seisXUmNoite[0],
      horarioSaida6x1NoiteMin: seisXUmNoite[1],
      horarioEntrada12x36Min: dozeXTrintaSeis[0],
      horarioSaida12x36Min: dozeXTrintaSeis[1],
      horarioEntrada12x36NoiteMin: dozeXTrintaSeisNoite[0],
      horarioSaida12x36NoiteMin: dozeXTrintaSeisNoite[1],
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/funcionarios");
  return { sucesso: true };
}

export type SemanaPagamentoState = { erro?: string; sucesso?: boolean } | undefined;

const DIAS_SEMANA_VALIDOS = [1, 2, 3, 4, 5, 6, 7];

/** Configuração da semana de pagamento pra quem está em frequência SEMANAL
 * (ver VinculoPessoaEmpresa.frequenciaPagamento) — de qual dia a qual dia
 * ela conta, e em qual dia o valor acumulado é pago. */
export async function atualizarSemanaPagamento(
  _prev: SemanaPagamentoState,
  formData: FormData
): Promise<SemanaPagamentoState> {
  const sessao = await requireTenant();

  const inicioDia = Number(formData.get("semanaPagamentoInicioDia"));
  const diaPagamento = Number(formData.get("semanaPagamentoDia"));

  if (!DIAS_SEMANA_VALIDOS.includes(inicioDia) || !DIAS_SEMANA_VALIDOS.includes(diaPagamento)) {
    return { erro: "Selecione dias da semana válidos." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { semanaPagamentoInicioDia: inicioDia, semanaPagamentoDia: diaPagamento },
  });

  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type ContagemLimpezaTurnos =
  | { erro: string }
  | { turnos: number; valorTotal: number; registrosPonto: number };

/** Só conta, não apaga nada — pra mostrar o impacto antes da pessoa
 * confirmar. Reaproveitado tanto na prévia quanto validado de novo dentro
 * de limparTurnosAntesDe, pra nunca apagar sem antes checar o que tem. */
async function buscarRegistrosParaLimpeza(empresaId: number, cutoff: Date) {
  const [turnos, registrosPonto] = await Promise.all([
    prisma.turno.findMany({
      where: { empresaId, horaEntrada: { lt: cutoff } },
      select: { id: true, valorTotal: true },
    }),
    prisma.registroPonto.count({
      where: { empresaId, horaEntrada: { lt: cutoff } },
    }),
  ]);
  return { turnos, registrosPonto };
}

export async function contarTurnosAntesDe(cutoffISO: string): Promise<ContagemLimpezaTurnos> {
  const sessao = await requireTenant();
  const cutoff = new Date(cutoffISO);
  if (Number.isNaN(cutoff.getTime())) return { erro: "Data inválida." };

  const { turnos, registrosPonto } = await buscarRegistrosParaLimpeza(
    sessao.empresaEfetivoId,
    cutoff
  );
  const valorTotal = turnos.reduce((soma, t) => soma + Number(t.valorTotal ?? 0), 0);

  return { turnos: turnos.length, valorTotal, registrosPonto };
}

export type LimpezaTurnosState = { erro?: string; sucesso?: true; apagados?: number } | undefined;

/** Apaga turnos (e pagamentos ligados, via cascade do schema) e registros de
 * ponto CLT anteriores à data escolhida — pensado pro período de teste que
 * sempre acontece quando uma empresa nova começa a usar o totem, antes do
 * "vale pra valer" de verdade. Cadastros de pessoa e vínculo NUNCA são
 * tocados aqui — só o histórico de jornada/pagamento. */
export async function limparTurnosAntesDe(
  _prev: LimpezaTurnosState,
  formData: FormData
): Promise<LimpezaTurnosState> {
  const sessao = await requireTenant();

  const cutoffISO = String(formData.get("cutoff") ?? "");
  const cutoff = new Date(cutoffISO);
  if (Number.isNaN(cutoff.getTime())) return { erro: "Data inválida." };

  const { turnos } = await buscarRegistrosParaLimpeza(sessao.empresaEfetivoId, cutoff);

  await prisma.$transaction([
    prisma.turno.deleteMany({
      where: { empresaId: sessao.empresaEfetivoId, horaEntrada: { lt: cutoff } },
    }),
    prisma.registroPonto.deleteMany({
      where: { empresaId: sessao.empresaEfetivoId, horaEntrada: { lt: cutoff } },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/turnos");
  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
  revalidatePath("/funcionarios");
  revalidatePath("/relatorios");

  return { sucesso: true, apagados: turnos.length };
}
