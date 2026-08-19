"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { textoParaTermos } from "@/lib/termos";

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

  const modoPausa = String(formData.get("modoPausa") ?? "");
  if (!MODOS_PAUSA_VALIDOS.includes(modoPausa as (typeof MODOS_PAUSA_VALIDOS)[number])) {
    return { erro: "Selecione uma opção válida." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { modoPausa: modoPausa as (typeof MODOS_PAUSA_VALIDOS)[number] },
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

const HORA_MIN_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Horário de fechamento da empresa, usado pelo cron de fechamento
 * automático (src/lib/fechamento-automatico.ts) como horaSaida de turnos
 * que ninguém bateu saída. */
export async function atualizarHorarioFechamento(
  _prev: HorarioFechamentoState,
  formData: FormData
): Promise<HorarioFechamentoState> {
  const sessao = await requireTenant();

  const horario = String(formData.get("horarioFechamento") ?? "");
  const match = HORA_MIN_REGEX.exec(horario);
  if (!match) {
    return { erro: "Informe um horário válido (HH:MM)." };
  }

  const horarioFechamentoMin = Number(match[1]) * 60 + Number(match[2]);

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { horarioFechamentoMin },
  });

  revalidatePath("/configuracoes");
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
