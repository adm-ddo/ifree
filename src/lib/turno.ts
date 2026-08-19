import "server-only";
import { prisma } from "@/lib/prisma";
import type { ModoPausa, ModoPagamento } from "@/generated/prisma/enums";

const TURNO_COM_RELACOES = {
  include: {
    pessoa: {
      select: {
        nome: true,
        documento: true,
        tipoDocumento: true,
        telefone: true,
        endereco: true,
        numero: true,
        complemento: true,
        chavePix: true,
        tipoChavePix: true,
      },
    },
    empresa: {
      select: { nome: true, cnpj: true, endereco: true, termosContrato: true, modoPausa: true },
    },
    funcao: { select: { nome: true } },
  },
} as const;

export type TurnoComRelacoes = NonNullable<
  Awaited<ReturnType<typeof buscarTurnoDaEmpresa>>
>;

/** Busca um turno já checando que pertence à empresa efetiva da sessão —
 * usado tanto na página de detalhe quanto nas rotas de PDF, que não têm
 * escopo de tenant embutido na query (diferente de listagens por
 * `where: { empresaId }`) e por isso precisam dessa checagem explícita. */
export async function buscarTurnoDaEmpresa(turnoId: number, empresaId: number) {
  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    ...TURNO_COM_RELACOES,
  });
  if (!turno || turno.empresaId !== empresaId) return null;
  return turno;
}

const BLOCO_ARREDONDAMENTO_MIN = 5;

/** A partir de quantos minutos trabalhados o desconto automático de pausa
 * passa a valer — mesmo gatilho que o CLT usa pra exigir intervalo (jornada
 * acima de 6h), embora não se aplique legalmente a freelancer/autônomo. */
const LIMIAR_PAUSA_MIN = 360;

const DESCONTO_POR_MODO: Record<ModoPausa, number> = {
  NENHUMA: 0,
  AUTOMATICA_30: 30,
  AUTOMATICA_60: 60,
};

/** Arredondamento pro bloco de 5min mais próximo, com empate EXATO (2min30s
 * de excesso sobre o bloco anterior) descendo, e qualquer coisa a partir de
 * 2min31s subindo — decisão explícita do usuário, diferente da regra
 * "half-up" anterior (que arredondava o empate pra cima). Ex: excesso de
 * 2:30 sobre um bloco de 5min → desce; excesso de 2:31 → sobe.
 *
 * Antes de arredondar, desconta a pausa automática da empresa (se
 * configurada) de turnos acima de 6h — pensado pra cobrir cigarro/banheiro/
 * refeição espalhados ao longo do turno, sem depender da pessoa registrar
 * nada (o que na prática nunca acontece, já que registrar reduz o próprio
 * pagamento). */
export function calcularMinutosArredondados(
  elapsedMs: number,
  modoPausa: ModoPausa = "NENHUMA"
): {
  minutosTrabalhados: number;
  minutosDescontadosPausa: number;
  minutosArredondados: number;
} {
  const minutosTrabalhados = Math.round(elapsedMs / 60_000);

  const descontoMin = DESCONTO_POR_MODO[modoPausa];
  const minutosDescontadosPausa =
    descontoMin > 0 && minutosTrabalhados > LIMIAR_PAUSA_MIN ? descontoMin : 0;
  const elapsedPagoMs = elapsedMs - minutosDescontadosPausa * 60_000;

  const blocoMs = BLOCO_ARREDONDAMENTO_MIN * 60_000;
  const resto = elapsedPagoMs % blocoMs;
  const baseMs = elapsedPagoMs - resto;
  const arredondadoMs = resto <= blocoMs / 2 ? baseMs : baseMs + blocoMs;
  const minutosArredondados = Math.round(arredondadoMs / 60_000);

  return { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados };
}

export function calcularValorTotal(
  minutosArredondados: number,
  valorHora: number
): number {
  return Math.round((minutosArredondados / 60) * valorHora * 100) / 100;
}

/** Percentual da diária pago conforme os minutos trabalhados (já com pausa
 * descontada e arredondados) em relação aos limiares configurados pela
 * empresa — mesma base de minutos usada no cálculo por hora, pra manter os
 * dois modos consistentes entre si. */
function percentualDiaria(
  minutosArredondados: number,
  diariaLimiarMeiaMin: number,
  diariaLimiarCompletaMin: number
): number {
  if (minutosArredondados >= diariaLimiarCompletaMin) return 1;
  if (minutosArredondados >= diariaLimiarMeiaMin) return 0.75;
  return 0.5;
}

/** Calcula o valor final do turno considerando o modo de pagamento
 * aplicado (snapshot do vínculo no check-in) — HORA usa o cálculo de
 * sempre, DIARIA paga uma fração fixa combinada com a pessoa conforme as
 * faixas de horas da empresa. */
export function calcularValorTurno(params: {
  modoPagamento: ModoPagamento;
  minutosArredondados: number;
  valorHoraAplicado: number;
  valorDiariaAplicada: number | null;
  diariaLimiarMeiaMin: number;
  diariaLimiarCompletaMin: number;
}): number {
  if (params.modoPagamento === "DIARIA" && params.valorDiariaAplicada !== null) {
    const percentual = percentualDiaria(
      params.minutosArredondados,
      params.diariaLimiarMeiaMin,
      params.diariaLimiarCompletaMin
    );
    return Math.round(params.valorDiariaAplicada * percentual * 100) / 100;
  }
  return calcularValorTotal(params.minutosArredondados, params.valorHoraAplicado);
}
