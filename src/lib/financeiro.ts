import "server-only";
import { prisma } from "@/lib/prisma";
import { diaSemanaISOBrasil, inicioDoDiaBrasil } from "@/lib/data";
import type { FrequenciaPagamento, StatusPagamento } from "@/generated/prisma/enums";

/** Status que ainda representam dinheiro não entregue — PROCESSANDO entra
 * aqui porque, mesmo automatizado (Stone), enquanto não vira CONCLUIDO o
 * valor ainda está pendente do ponto de vista de quem só olha o painel. */
export const STATUS_PENDENTES: StatusPagamento[] = ["PENDENTE", "FALHOU", "PROCESSANDO"];

async function somaPendente(
  empresaId: number,
  frequencia?: FrequenciaPagamento
): Promise<number> {
  const resultado = await prisma.pagamento.aggregate({
    _sum: { valor: true },
    where: {
      status: { in: STATUS_PENDENTES },
      turno: {
        empresaId,
        ...(frequencia ? { frequenciaPagamentoAplicada: frequencia } : {}),
      },
    },
  });
  return Number(resultado._sum?.valor ?? 0);
}

/** Pendente separado por frequência de recebimento — a cada turno (DIARIA)
 * vs acumulado semanal (SEMANAL). Mesmo enum, sentido diferente do
 * ModoPagamento (que é sobre COMO calcular o valor, não QUANDO pagar). */
export async function pendentePorFrequencia(
  empresaId: number
): Promise<{ diaria: number; semanal: number }> {
  const [diaria, semanal] = await Promise.all([
    somaPendente(empresaId, "DIARIA"),
    somaPendente(empresaId, "SEMANAL"),
  ]);
  return { diaria, semanal };
}

/** Total pendente da empresa, somando as duas frequências — o número
 * "quanto eu devo agora" do módulo Financeiro. */
export async function totalDevido(empresaId: number): Promise<number> {
  return somaPendente(empresaId);
}

export type LinhaPendentePessoa = { pessoaId: number; pessoaNome: string; quantidade: number; valor: number };

async function pendentesAgrupadosPorPessoa(
  empresaId: number,
  frequencia: FrequenciaPagamento
): Promise<LinhaPendentePessoa[]> {
  const pagamentos = await prisma.pagamento.findMany({
    where: {
      status: { in: STATUS_PENDENTES },
      turno: { empresaId, frequenciaPagamentoAplicada: frequencia },
    },
    select: {
      valor: true,
      turno: { select: { pessoaId: true, pessoa: { select: { nome: true } } } },
    },
  });

  const porPessoa = new Map<number, LinhaPendentePessoa>();
  for (const p of pagamentos) {
    const atual = porPessoa.get(p.turno.pessoaId) ?? {
      pessoaId: p.turno.pessoaId,
      pessoaNome: p.turno.pessoa.nome,
      quantidade: 0,
      valor: 0,
    };
    atual.quantidade += 1;
    atual.valor += Number(p.valor);
    porPessoa.set(p.turno.pessoaId, atual);
  }

  return [...porPessoa.values()].sort((a, b) => b.valor - a.valor);
}

/** Detalhe por pessoa de cada um dos dois totais de pendentePorFrequencia —
 * pra não misturar os valores num número só: mostra quem exatamente está
 * pendente em cada grupo, e quanto cada um. */
export async function pendentesPorPessoa(
  empresaId: number
): Promise<{ diaria: LinhaPendentePessoa[]; semanal: LinhaPendentePessoa[] }> {
  const [diaria, semanal] = await Promise.all([
    pendentesAgrupadosPorPessoa(empresaId, "DIARIA"),
    pendentesAgrupadosPorPessoa(empresaId, "SEMANAL"),
  ]);
  return { diaria, semanal };
}

/** Próxima data (hoje ou futura) em que cai o dia de pagamento semanal
 * configurado pela empresa — só pra exibição ("acumulado pra pagar dia
 * X"), não filtra nada. `semanaPagamentoDia` é ISO (1=segunda...7=domingo,
 * ver Empresa.semanaPagamentoDia). */
export function proximoDiaPagamento(agora: Date, semanaPagamentoDia: number): Date {
  const diaHoje = diaSemanaISOBrasil(agora);
  const diasAtePagamento = (semanaPagamentoDia - diaHoje + 7) % 7;
  const hoje = inicioDoDiaBrasil(agora);
  return new Date(hoje.getTime() + diasAtePagamento * 24 * 60 * 60 * 1000);
}

export type LinhaPagamentoConcluido = {
  valor: number;
  processadoEm: Date;
  pessoaNome: string;
  frequencia: FrequenciaPagamento;
};

/** Lista flat de pagamentos já concluídos (de fato pagos) num período —
 * base pro relatório do módulo Financeiro. O agrupamento por dia/semana/
 * mês/pessoa acontece em cima dessa lista, em JS, no mesmo estilo já usado
 * em relatorios/page.tsx (esse projeto não usa Prisma groupBy). */
export async function relatorioPagos(
  empresaId: number,
  inicio: Date,
  fim: Date
): Promise<LinhaPagamentoConcluido[]> {
  const pagamentos = await prisma.pagamento.findMany({
    where: {
      status: "CONCLUIDO",
      processadoEm: { gte: inicio, lte: fim },
      turno: { empresaId },
    },
    select: {
      valor: true,
      processadoEm: true,
      turno: {
        select: { frequenciaPagamentoAplicada: true, pessoa: { select: { nome: true } } },
      },
    },
    orderBy: { processadoEm: "asc" },
  });

  return pagamentos
    .filter((p) => p.processadoEm !== null)
    .map((p) => ({
      valor: Number(p.valor),
      processadoEm: p.processadoEm as Date,
      pessoaNome: p.turno.pessoa.nome,
      frequencia: p.turno.frequenciaPagamentoAplicada,
    }));
}

export type Agrupamento = "dia" | "semana" | "mes" | "pessoa";

export type LinhaAgrupada = { chave: string; quantidade: number; valor: number; ordenacao: string };

/** Agrupa a lista flat de relatorioPagos conforme o modo escolhido — chave
 * de exibição em pt-BR, mas guarda uma `ordenacao` (ISO) separada pra
 * ordenar corretamente mesmo quando a chave exibida é um label textual. */
export function agruparPagamentos(
  linhas: LinhaPagamentoConcluido[],
  modo: Agrupamento
): LinhaAgrupada[] {
  const grupos = new Map<string, LinhaAgrupada>();

  for (const linha of linhas) {
    const { chave, ordenacao } = chaveDoGrupo(linha, modo);
    const atual = grupos.get(chave) ?? { chave, quantidade: 0, valor: 0, ordenacao };
    atual.quantidade += 1;
    atual.valor += linha.valor;
    grupos.set(chave, atual);
  }

  return [...grupos.values()].sort((a, b) => a.ordenacao.localeCompare(b.ordenacao));
}

function chaveDoGrupo(
  linha: LinhaPagamentoConcluido,
  modo: Agrupamento
): { chave: string; ordenacao: string } {
  if (modo === "pessoa") {
    return { chave: linha.pessoaNome, ordenacao: linha.pessoaNome };
  }

  const dataISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(linha.processadoEm);

  if (modo === "dia") {
    const label = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(linha.processadoEm);
    return { chave: label, ordenacao: dataISO };
  }

  if (modo === "mes") {
    const [ano, mes] = dataISO.split("-");
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(linha.processadoEm);
    return { chave: label, ordenacao: `${ano}-${mes}` };
  }

  // semana: segunda-feira daquela semana como início, no calendário de
  // Brasília (mesma convenção ISO usada no resto do app).
  const diaISO = diaSemanaISOBrasil(linha.processadoEm);
  const inicioDaSemana = new Date(
    inicioDoDiaBrasil(linha.processadoEm).getTime() - (diaISO - 1) * 24 * 60 * 60 * 1000
  );
  const fimDaSemana = new Date(inicioDaSemana.getTime() + 6 * 24 * 60 * 60 * 1000);
  const formatarCurta = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);
  const label = `${formatarCurta(inicioDaSemana)} a ${formatarCurta(fimDaSemana)}`;
  const ordenacaoSemana = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(inicioDaSemana);
  return { chave: label, ordenacao: ordenacaoSemana };
}
