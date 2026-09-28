import "server-only";
import { prisma } from "@/lib/prisma";

/** Contadores de confiabilidade em cima do histórico de Free Marcado (ver
 * ExtraMarcado no schema) — pedido do Thiago em 2026-09-28: quando um
 * lado desmarca (ou nunca aparece), o outro lado precisa enxergar isso
 * antes de se comprometer de novo, não só descobrir na hora. */

/** Quantas vezes esta EMPRESA já desmarcou um Free (seja antes ou depois
 * da pessoa ter confirmado) — mostrado pro freelancer antes dele
 * confirmar um Free novo com essa empresa (ver ExtraMarcadoPessoa.tsx). */
export async function contarDesmarquesEmpresa(empresaId: number): Promise<number> {
  return prisma.extraMarcado.count({
    where: { empresaId, status: "CANCELADO", canceladoPor: "EMPRESA" },
  });
}

/** Mesma contagem acima, em lote pra várias empresas de uma vez — evita
 * N+1 quando a pessoa tem vários Frees pendentes/confirmados com
 * empresas diferentes ao mesmo tempo. */
export async function contarDesmarquesEmpresaEmLote(empresaIds: number[]): Promise<Map<number, number>> {
  if (empresaIds.length === 0) return new Map();
  const grupos = await prisma.extraMarcado.groupBy({
    by: ["empresaId"],
    where: { empresaId: { in: empresaIds }, status: "CANCELADO", canceladoPor: "EMPRESA" },
    _count: { _all: true },
  });
  return new Map(grupos.map((g) => [g.empresaId, g._count._all]));
}

/** Quantas vezes esta PESSOA marcou um Free, confirmou, e DEPOIS
 * desmarcou (canceladoPor=PESSOA + confirmadoPessoaEm já preenchido) —
 * diferente de recusar ainda AGUARDANDO_PESSOA (nunca chegou a confirmar,
 * não conta aqui) e diferente de NAO_COMPARECEU (marcou falta, é outro
 * contador — ver faltas em ReputacaoCard.tsx). Mostrado pra empresa na
 * reputação da pessoa. */
export async function contarDesmarquesPessoaDepoisDeAceitar(pessoaId: number): Promise<number> {
  return prisma.extraMarcado.count({
    where: { pessoaId, status: "CANCELADO", canceladoPor: "PESSOA", confirmadoPessoaEm: { not: null } },
  });
}

/** Mesma contagem acima, em lote pra várias pessoas de uma vez — usada
 * nas listas de candidaturas (várias pessoas na mesma tela), evita N+1. */
export async function contarDesmarquesPessoaEmLote(pessoaIds: number[]): Promise<Map<number, number>> {
  if (pessoaIds.length === 0) return new Map();
  const grupos = await prisma.extraMarcado.groupBy({
    by: ["pessoaId"],
    where: { pessoaId: { in: pessoaIds }, status: "CANCELADO", canceladoPor: "PESSOA", confirmadoPessoaEm: { not: null } },
    _count: { _all: true },
  });
  return new Map(grupos.map((g) => [g.pessoaId, g._count._all]));
}
