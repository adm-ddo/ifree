import "server-only";
import { prisma } from "@/lib/prisma";
import type { FrequenciaPagamento } from "@/generated/prisma/enums";

export type LinhaPorFuncao = {
  funcaoId: number;
  nome: string;
  minutos: number;
  valor: number;
  turnos: number;
};

export type LinhaPorPessoaFuncao = {
  pessoaId: number;
  pessoaNome: string;
  funcaoId: number;
  funcaoNome: string;
  minutos: number;
  valor: number;
  turnos: number;
  /** Snapshot do turno mais recente da pessoa nessa função no período —
   * frequenciaPagamentoAplicada é gravada por turno, não por pessoa, mas
   * na prática não muda de um turno pro outro no mesmo período (só muda
   * se o dono reconfigurar o vínculo entre um turno e outro). */
  frequencia: FrequenciaPagamento;
};

export type CustoPorFuncao = {
  totalMinutos: number;
  totalValor: number;
  totalTurnos: number;
  porFuncao: LinhaPorFuncao[];
  porPessoaFuncao: LinhaPorPessoaFuncao[];
};

/** Agregação de custo por função e por pessoa-dentro-da-função num período
 * — extraído de relatorios/page.tsx pra ser reaproveitado também pelos
 * PDFs (por função, geral). Mesmo padrão de agregação em `Map` já usado
 * em todo o projeto (sem `groupBy` do Prisma). Ordena por horaEntrada
 * asc de propósito: a última iteração de cada pessoa/função deixa
 * gravada a frequência mais recente daquele bucket. */
export async function agregarCustoPorFuncao(
  empresaId: number,
  inicio: Date,
  fim: Date,
  frequencia?: FrequenciaPagamento
): Promise<CustoPorFuncao> {
  const turnos = await prisma.turno.findMany({
    where: {
      empresaId,
      valorTotal: { not: null },
      horaEntrada: { gte: inicio, lte: fim },
      ...(frequencia ? { frequenciaPagamentoAplicada: frequencia } : {}),
    },
    orderBy: { horaEntrada: "asc" },
    select: {
      pessoaId: true,
      funcaoId: true,
      minutosArredondados: true,
      valorTotal: true,
      frequenciaPagamentoAplicada: true,
      pessoa: { select: { nome: true } },
      funcao: { select: { nome: true } },
    },
  });

  let totalMinutos = 0;
  let totalValor = 0;

  const porFuncao = new Map<number, LinhaPorFuncao>();
  const porPessoaFuncao = new Map<string, LinhaPorPessoaFuncao>();

  for (const t of turnos) {
    const minutos = t.minutosArredondados ?? 0;
    const valor = Number(t.valorTotal ?? 0);
    totalMinutos += minutos;
    totalValor += valor;

    const funcaoAtual = porFuncao.get(t.funcaoId) ?? {
      funcaoId: t.funcaoId,
      nome: t.funcao.nome,
      minutos: 0,
      valor: 0,
      turnos: 0,
    };
    funcaoAtual.minutos += minutos;
    funcaoAtual.valor += valor;
    funcaoAtual.turnos += 1;
    porFuncao.set(t.funcaoId, funcaoAtual);

    const chave = `${t.pessoaId}-${t.funcaoId}`;
    const pessoaAtual = porPessoaFuncao.get(chave) ?? {
      pessoaId: t.pessoaId,
      pessoaNome: t.pessoa.nome,
      funcaoId: t.funcaoId,
      funcaoNome: t.funcao.nome,
      minutos: 0,
      valor: 0,
      turnos: 0,
      frequencia: t.frequenciaPagamentoAplicada,
    };
    pessoaAtual.minutos += minutos;
    pessoaAtual.valor += valor;
    pessoaAtual.turnos += 1;
    pessoaAtual.frequencia = t.frequenciaPagamentoAplicada;
    porPessoaFuncao.set(chave, pessoaAtual);
  }

  return {
    totalMinutos,
    totalValor,
    totalTurnos: turnos.length,
    porFuncao: [...porFuncao.values()].sort((a, b) => b.valor - a.valor),
    porPessoaFuncao: [...porPessoaFuncao.values()].sort((a, b) => b.valor - a.valor),
  };
}
