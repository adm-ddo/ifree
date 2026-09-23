// Sem "server-only": acoesPossiveisPonto() é importada tanto do totem
// (client component, pra decidir a tela) quanto das actions (server, pra
// validar) — as duas precisam da mesma lógica, então não pode ser
// server-only. Nenhuma função deste arquivo toca banco de dados.

import { dataISOBrasil, instanteBrasil } from "@/lib/data";
import { LIMIAR_PAUSA_MIN, DESCONTO_POR_MODO } from "@/lib/pausa";
import type { EscalaTrabalho, ModoPausa } from "@/generated/prisma/enums";

/** Converte "HH:MM" em minutos desde meia-noite — null se o formato não
 * bater. Usado nos formulários de horário (fechamento de turno, escala
 * CLT) tanto pra validar no server quanto pra converter de volta pro
 * <input type="time"> no client. */
export function paraMinutosHorario(valor: string | null | undefined): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(String(valor ?? ""));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Inverso de paraMinutosHorario — minutos desde meia-noite pra "HH:MM",
 * pro defaultValue de um <input type="time">. */
export function minutosParaHorario(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Minutos trabalhados num RegistroPonto (funcionário CLT): tempo total
 * entre entrada e saída, menos o intervalo. Duas fontes possíveis pro
 * intervalo, nesta ordem de prioridade:
 * 1. Intervalo batido de verdade no totem (entradaIntervalo+saidaIntervalo,
 *    só existe quando Empresa.funcionariosBaterIntervalo está ligado) — o
 *    real sempre vence a estimativa, mesmo que modoPausa também esteja
 *    configurado.
 * 2. Sem punção real: desconto automático por jornada longa
 *    (Empresa.modoPausaDia/modoPausaNoite, mesmo limiar/tabela do extra —
 *    ver calcularMinutosArredondados em src/lib/turno.ts) — cobre o
 *    intervalo intrajornada que a CLT exige (art. 71) mesmo quando a
 *    empresa não faz a pessoa bater ponto disso.
 * Sem arredondamento em bloco de 5min — isso é específico do cálculo de
 * pagamento do extra, não se aplica ao controle interno de jornada do CLT,
 * que não tem valor nenhum envolvido. */
export function calcularMinutosPonto({
  horaEntrada,
  horaSaida,
  entradaIntervalo,
  saidaIntervalo,
  modoPausa = "NENHUMA",
}: {
  horaEntrada: Date;
  horaSaida: Date;
  entradaIntervalo?: Date | null;
  saidaIntervalo?: Date | null;
  modoPausa?: ModoPausa;
}): { minutosTrabalhados: number; minutosDescontadosPausa: number | null } {
  const totalMinutos = Math.round((horaSaida.getTime() - horaEntrada.getTime()) / 60_000);

  if (entradaIntervalo && saidaIntervalo) {
    const intervaloMin = Math.max(
      0,
      Math.round((saidaIntervalo.getTime() - entradaIntervalo.getTime()) / 60_000)
    );
    // minutosDescontadosPausa fica null aqui de propósito — a duração real
    // do intervalo já aparece explícita pro dono (horário de início e fim
    // batidos de verdade), repetir como "Xmin descontados" seria
    // redundante. Esse campo é só pra tornar visível o desconto
    // AUTOMÁTICO (estimado), que senão ficaria escondido dentro do total.
    return {
      minutosTrabalhados: Math.max(0, totalMinutos - intervaloMin),
      minutosDescontadosPausa: null,
    };
  }

  const descontoMin = DESCONTO_POR_MODO[modoPausa];
  const aplicaDesconto = descontoMin > 0 && totalMinutos > LIMIAR_PAUSA_MIN;
  return {
    minutosTrabalhados: Math.max(0, totalMinutos - (aplicaDesconto ? descontoMin : 0)),
    minutosDescontadosPausa: aplicaDesconto ? descontoMin : null,
  };
}

const INICIO_HORA_NOTURNA_MIN = 22 * 60; // 22:00
const FIM_HORA_NOTURNA_MIN = 24 * 60 + 5 * 60; // 05:00 do dia seguinte

/** Minutos trabalhados dentro do horário noturno legal urbano (22h às 5h,
 * CLT art. 73) num período de trabalho — soma a sobreposição real do
 * período com a janela [22h de cada dia, 5h do dia seguinte), percorrendo
 * dia a dia pra turnos que atravessam mais de uma virada (ex.: 12x36
 * começando às 19h). Devolve minuto-relógio real, SEM aplicar a "hora
 * noturna reduzida" (52min30s = 1h) do mesmo artigo — quem decide se
 * aplica essa redução (e o adicional de pelo menos 20%) na folha é o
 * contador; aqui só entra o dado bruto de quanto foi trabalhado dentro da
 * janela noturna, pra não arriscar duplicar um cálculo que o sistema de
 * folha já faz. */
export function calcularMinutosNoturnos(horaEntrada: Date, horaSaida: Date): number {
  if (horaSaida <= horaEntrada) return 0;
  let minutos = 0;
  // Começa um dia ANTES do dia da entrada: um turno inteiramente de
  // madrugada (ex.: 02h-04h) cai dentro da janela que começou às 22h do
  // dia anterior, não do próprio dia da entrada.
  let inicioDia = new Date(
    instanteBrasil(dataISOBrasil(horaEntrada)).getTime() - 24 * 60 * 60_000
  );
  while (inicioDia < horaSaida) {
    const inicioJanela = new Date(inicioDia.getTime() + INICIO_HORA_NOTURNA_MIN * 60_000);
    const fimJanela = new Date(inicioDia.getTime() + FIM_HORA_NOTURNA_MIN * 60_000);
    const inicioSobreposicao = Math.max(inicioJanela.getTime(), horaEntrada.getTime());
    const fimSobreposicao = Math.min(fimJanela.getTime(), horaSaida.getTime());
    if (fimSobreposicao > inicioSobreposicao) {
      minutos += Math.round((fimSobreposicao - inicioSobreposicao) / 60_000);
    }
    inicioDia = new Date(inicioDia.getTime() + 24 * 60 * 60_000);
  }
  return minutos;
}

export const LABEL_ESCALA_TRABALHO: Record<string, string> = {
  CINCO_X_DOIS: "5x2",
  SEIS_X_UM: "6x1",
  DOZE_X_TRINTA_E_SEIS: "12x36",
  OUTRA: "Outra",
};

export type AcaoPonto = "ENTRADA" | "SAIDA_INTERVALO" | "VOLTA_INTERVALO" | "SAIDA_FINAL";

export const LABEL_ACAO_PONTO: Record<AcaoPonto, string> = {
  ENTRADA: "Entrada",
  SAIDA_INTERVALO: "Saída pro intervalo",
  VOLTA_INTERVALO: "Voltar do intervalo",
  SAIDA_FINAL: "Encerrar o dia",
};

/** Quais ações fazem sentido bater agora, dado o estado atual do
 * RegistroPonto aberto (ou a ausência de um) e se a empresa exige
 * intervalo. Usada tanto no totem (decidir se pergunta algo pra pessoa ou
 * já segue direto) quanto nas actions (nunca confiar só na ação que o
 * cliente mandou — recalcular e validar aqui). */
export function acoesPossiveisPonto(
  registroAberto: { entradaIntervalo: Date | string | null; saidaIntervalo: Date | string | null } | null,
  intervaloHabilitado: boolean
): AcaoPonto[] {
  if (!registroAberto) return ["ENTRADA"];
  if (!registroAberto.entradaIntervalo) {
    return intervaloHabilitado ? ["SAIDA_INTERVALO", "SAIDA_FINAL"] : ["SAIDA_FINAL"];
  }
  if (!registroAberto.saidaIntervalo) return ["VOLTA_INTERVALO"];
  return ["SAIDA_FINAL"];
}

/** Tolerância antes de considerar um horário de ponto CLT como desviado —
 * mesmo espírito do art. 58 §1º da CLT, que não considera como jornada
 * variações de até 5 minutos por marcação. Fixo (não configurável): é um
 * número pequeno e com base legal, não um ajuste fino que cada empresa
 * precisaria decidir. */
export const TOLERANCIA_PONTO_CLT_MIN = 5;

type HorarioEsperadoClt = { entradaMin: number; saidaMin: number };

/** Horário esperado de entrada/saída pra um vínculo CLT — o horário
 * específico da pessoa (VinculoPessoaEmpresa.horarioEntradaMin/
 * horarioSaidaMin) tem prioridade; na ausência dele, cai pro padrão da
 * escala configurado na empresa, usando o par manhã ou noite conforme
 * `turno` (VinculoPessoaEmpresa.escalaTurno — null ou LIVRE cai no par da
 * manhã). Sem nenhum dos dois (ou escala OUTRA, que não tem padrão),
 * retorna null — nesse caso não há o que comparar, mesmo espírito
 * informativo de sempre. */
export function horarioEsperadoClt(
  escala: EscalaTrabalho | null,
  turno: "MANHA" | "NOITE" | "LIVRE" | null,
  overrideEntradaMin: number | null,
  overrideSaidaMin: number | null,
  empresa: {
    horarioEntrada5x2Min: number | null;
    horarioSaida5x2Min: number | null;
    horarioEntrada5x2NoiteMin: number | null;
    horarioSaida5x2NoiteMin: number | null;
    horarioEntrada6x1Min: number | null;
    horarioSaida6x1Min: number | null;
    horarioEntrada6x1NoiteMin: number | null;
    horarioSaida6x1NoiteMin: number | null;
    horarioEntrada12x36Min: number | null;
    horarioSaida12x36Min: number | null;
    horarioEntrada12x36NoiteMin: number | null;
    horarioSaida12x36NoiteMin: number | null;
  }
): HorarioEsperadoClt | null {
  if (overrideEntradaMin !== null && overrideSaidaMin !== null) {
    return { entradaMin: overrideEntradaMin, saidaMin: overrideSaidaMin };
  }
  const ehNoite = turno === "NOITE";
  const padraoPorEscala: Partial<Record<EscalaTrabalho, [number | null, number | null]>> = {
    CINCO_X_DOIS: ehNoite
      ? [empresa.horarioEntrada5x2NoiteMin, empresa.horarioSaida5x2NoiteMin]
      : [empresa.horarioEntrada5x2Min, empresa.horarioSaida5x2Min],
    SEIS_X_UM: ehNoite
      ? [empresa.horarioEntrada6x1NoiteMin, empresa.horarioSaida6x1NoiteMin]
      : [empresa.horarioEntrada6x1Min, empresa.horarioSaida6x1Min],
    DOZE_X_TRINTA_E_SEIS: ehNoite
      ? [empresa.horarioEntrada12x36NoiteMin, empresa.horarioSaida12x36NoiteMin]
      : [empresa.horarioEntrada12x36Min, empresa.horarioSaida12x36Min],
  };
  const [entradaMin, saidaMin] = (escala && padraoPorEscala[escala]) || [null, null];
  if (entradaMin === null || saidaMin === null) return null;
  return { entradaMin, saidaMin };
}

/** Diferença em minutos entre um instante real e um horário esperado
 * (minutos desde meia-noite Brasília) — positivo quando o real vem depois
 * do esperado. Escolhe a meia-noite mais próxima do instante real (em vez
 * de sempre a do mesmo dia-calendário) pra turnos que atravessam a
 * meia-noite (ex.: 12x36 começando às 19h) não gerarem um desvio gigante
 * artificial — mesmo espírito de alertaHorarioNormal no dashboard. */
function minutosDeDesvio(horaReal: Date, minutoEsperado: number): number {
  const dataISO = dataISOBrasil(horaReal);
  let esperado = instanteBrasil(dataISO, minutoEsperado);
  const diffMs = horaReal.getTime() - esperado.getTime();
  if (diffMs > 12 * 60 * 60_000) esperado = new Date(esperado.getTime() + 24 * 60 * 60_000);
  else if (diffMs < -12 * 60 * 60_000) esperado = new Date(esperado.getTime() - 24 * 60 * 60_000);
  return Math.round((horaReal.getTime() - esperado.getTime()) / 60_000);
}

/** Horário de saída sugerido pra fechar manualmente um RegistroPonto
 * pendente — mesmo dia da entrada, no horário esperado (ver
 * horarioEsperadoClt), empurrado pro dia seguinte se cair antes da
 * entrada (turno que atravessa a meia-noite). Null quando não há horário
 * configurado pra essa pessoa/escala — nesse caso o campo continua em
 * branco, exatamente como sempre foi (é só uma sugestão, nunca obrigatória:
 * quem preenche sempre pode digitar o horário real, que pode não bater com
 * o esperado). */
export function saidaEsperadaClt(horaEntrada: Date, esperado: HorarioEsperadoClt | null): Date | null {
  if (!esperado) return null;
  const dataISO = dataISOBrasil(horaEntrada);
  let saida = instanteBrasil(dataISO, esperado.saidaMin);
  if (saida <= horaEntrada) saida = new Date(saida.getTime() + 24 * 60 * 60_000);
  return saida;
}

/** Modo de pausa que vale pra este turno CLT — o override da pessoa
 * (VinculoPessoaEmpresa.modoPausaOverride) tem prioridade; na ausência
 * dele, cai pro padrão da empresa (Empresa.modoPausaCltDia/Noite,
 * conforme o tipo do turno) — mesma regra de prioridade override→padrão
 * já usada em horarioEsperadoClt acima. */
export function resolverModoPausaClt(
  overrideModoPausa: ModoPausa | null,
  tipoTurno: "DIA" | "NOITE",
  empresa: { modoPausaCltDia: ModoPausa; modoPausaCltNoite: ModoPausa }
): ModoPausa {
  if (overrideModoPausa) return overrideModoPausa;
  return tipoTurno === "NOITE" ? empresa.modoPausaCltNoite : empresa.modoPausaCltDia;
}

export type DesvioPontoClt = { atrasoEntradaMin: number | null; saidaAntecipadaMin: number | null };

/** Compara entrada/saída reais de um RegistroPonto contra o horário
 * esperado (ver horarioEsperadoClt) — só sinaliza o que passa da
 * tolerância, e só nos sentidos que importam: chegar tarde (não chegar
 * cedo) e sair cedo (não ficar até mais tarde, que não é um problema aqui).
 * esperado null (pessoa/escala sem horário configurado) sempre retorna
 * null nos dois campos, sem comparação nenhuma. */
export function calcularDesvioPontoClt(
  horaEntrada: Date,
  horaSaida: Date | null,
  esperado: HorarioEsperadoClt | null
): DesvioPontoClt {
  if (!esperado) return { atrasoEntradaMin: null, saidaAntecipadaMin: null };

  const desvioEntrada = minutosDeDesvio(horaEntrada, esperado.entradaMin);
  const atrasoEntradaMin = desvioEntrada > TOLERANCIA_PONTO_CLT_MIN ? desvioEntrada : null;

  let saidaAntecipadaMin: number | null = null;
  if (horaSaida) {
    const desvioSaida = minutosDeDesvio(horaSaida, esperado.saidaMin);
    saidaAntecipadaMin = desvioSaida < -TOLERANCIA_PONTO_CLT_MIN ? -desvioSaida : null;
  }

  return { atrasoEntradaMin, saidaAntecipadaMin };
}

export type SaldoDiarioClt = { horaExtraMin: number | null; horasDevidasMin: number | null };

/** Saldo do dia pra um turno CLT: minutos trabalhados vs. a janela
 * esperada daquele dia (horarioEsperadoClt — horário específico da pessoa
 * ou padrão da escala/turno dela), descontando `pausaAplicadaMin` — a
 * MESMA pausa que já foi de fato descontada de `minutosTrabalhados` nesse
 * registro específico (o real, se a pessoa bateu intervalo, ou
 * RegistroPonto.minutosDescontadosPausa, o automático que valia na hora
 * em que o turno foi fechado). Importante usar o valor gravado no próprio
 * registro, NUNCA reconsultar o modoPausa atual da empresa/pessoa: se a
 * configuração de pausa mudar depois (ex.: empresa passa de 30 pra 60min
 * automáticos), recalcular a meta com a regra nova pra um turno antigo
 * fecharia a conta errado — um dia fechado com 30min de desconto pareceria
 * ter hora extra só porque a meta de hoje espera 60min de desconto. Meta e
 * realizado sempre usam a mesma régua: a que valia naquele dia. Mesma
 * tolerância de calcularDesvioPontoClt (5min, art. 58 §1º CLT) pra não
 * sinalizar diferença de arredondamento como hora extra/devida. esperado
 * null (pessoa/escala sem horário configurado) não compara nada. */
export function calcularSaldoDiarioClt(
  minutosTrabalhados: number | null,
  esperado: HorarioEsperadoClt | null,
  pausaAplicadaMin: number
): SaldoDiarioClt {
  if (minutosTrabalhados === null || !esperado) return { horaExtraMin: null, horasDevidasMin: null };
  let janelaMin = esperado.saidaMin - esperado.entradaMin;
  if (janelaMin <= 0) janelaMin += 24 * 60;
  const metaMin = Math.max(0, janelaMin - pausaAplicadaMin);
  const saldo = minutosTrabalhados - metaMin;
  if (saldo > TOLERANCIA_PONTO_CLT_MIN) return { horaExtraMin: saldo, horasDevidasMin: null };
  if (saldo < -TOLERANCIA_PONTO_CLT_MIN) return { horaExtraMin: null, horasDevidasMin: -saldo };
  return { horaExtraMin: null, horasDevidasMin: null };
}

/** Pausa que foi de fato descontada num RegistroPonto já fechado — real
 * (entradaIntervalo/saidaIntervalo batidos) tem prioridade; senão, o
 * automático já gravado (RegistroPonto.minutosDescontadosPausa). Mesma
 * prioridade de calcularMinutosPonto, só que lendo o resultado já salvo
 * em vez de recalcular a partir do modoPausa atual — ver
 * calcularSaldoDiarioClt acima pro motivo. */
export function pausaAplicadaEm(registro: {
  entradaIntervalo: Date | null;
  saidaIntervalo: Date | null;
  minutosDescontadosPausa: number | null;
}): number {
  if (registro.entradaIntervalo && registro.saidaIntervalo) {
    return Math.max(
      0,
      Math.round((registro.saidaIntervalo.getTime() - registro.entradaIntervalo.getTime()) / 60_000)
    );
  }
  return registro.minutosDescontadosPausa ?? 0;
}
