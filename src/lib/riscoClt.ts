import "server-only";
import { prisma } from "@/lib/prisma";
import { inicioDaSemanaBrasil } from "@/lib/data";
import type { SnapshotTermoCienciaGed } from "@/lib/ged";

/// A partir de quantos turnos na mesma semana o alerta de risco de vínculo
/// CLT dispara — trabalho constante/habitual é um dos critérios que pode
/// caracterizar subordinação (CLT art. 9º) mesmo sem carteira assinada,
/// mesmo pra quem presta serviço como autônomo/extra.
export const TURNOS_LIMIAR_RISCO_CLT = 3;

/// Slug do termo já existente no catálogo (ver TERMOS_CIENCIA_PADRAO em
/// src/lib/ged.ts) que resolve esse risco — a mesma declaração que
/// ConverterParaCltButton.tsx já linka.
export const TERMO_SLUG_RISCO_CLT = "opcao-autonomo-apos-oferta-clt";

export type RiscoCltPessoa = {
  pessoaId: number;
  pessoaNome: string;
  turnosNaSemana: number;
  dispensadoEm: Date | null;
};

/** Extras ativos desta empresa com 3+ turnos na semana atual (segunda a
 * agora, ver inicioDaSemanaBrasil) E que ainda não têm a declaração de
 * ciência da oferta CLT gerada — quem já tem a declaração nunca aparece
 * aqui, em nenhuma tela, porque o risco já está mitigado de verdade.
 * Serve tanto o alerta de topo (src/app/layout.tsx) quanto o lembrete na
 * página da pessoa (src/app/freelancers/[id]/page.tsx) — mesma query,
 * cada tela decide o que fazer com o resultado (o alerta de topo ainda
 * filtra por cima quem já dispensou; a página da pessoa mostra os dois
 * estados). */
export async function buscarRiscoCltEmpresa(empresaId: number): Promise<RiscoCltPessoa[]> {
  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId, tipoVinculo: "EXTRA", ativo: true },
    select: {
      pessoaId: true,
      riscoCltDispensadoEm: true,
      pessoa: { select: { nome: true } },
    },
  });
  if (vinculos.length === 0) return [];

  const pessoaIds = vinculos.map((v) => v.pessoaId);
  const inicioSemana = inicioDaSemanaBrasil(new Date());

  const [contagens, declaracoes] = await Promise.all([
    prisma.turno.groupBy({
      by: ["pessoaId"],
      where: { empresaId, pessoaId: { in: pessoaIds }, horaEntrada: { gte: inicioSemana } },
      _count: true,
    }),
    prisma.documentoGed.findMany({
      where: { empresaId, pessoaId: { in: pessoaIds }, tipo: "TERMO_CIENCIA" },
      select: { pessoaId: true, snapshotDados: true },
    }),
  ]);

  const turnosPorPessoa = new Map(contagens.map((c) => [c.pessoaId, c._count]));
  const pessoasComDeclaracao = new Set(
    declaracoes
      .filter((d) => (d.snapshotDados as unknown as SnapshotTermoCienciaGed).termoSlug === TERMO_SLUG_RISCO_CLT)
      .map((d) => d.pessoaId)
  );

  const resultado: RiscoCltPessoa[] = [];
  for (const v of vinculos) {
    if (pessoasComDeclaracao.has(v.pessoaId)) continue;
    const turnosNaSemana = turnosPorPessoa.get(v.pessoaId) ?? 0;
    if (turnosNaSemana < TURNOS_LIMIAR_RISCO_CLT && v.riscoCltDispensadoEm === null) continue;
    resultado.push({
      pessoaId: v.pessoaId,
      pessoaNome: v.pessoa.nome,
      turnosNaSemana,
      dispensadoEm: v.riscoCltDispensadoEm,
    });
  }
  return resultado;
}

/** Mesma lógica de buscarRiscoCltEmpresa acima, só que pra 1 pessoa —
 * usada na própria página do freelancer (/freelancers/[id]), onde não
 * vale a pena rodar a consulta da empresa inteira só pra extrair 1
 * resultado. Null quando não é EXTRA ativo, já tem a declaração gerada,
 * ou não bate o critério (nem 3+ turnos essa semana, nem dispensado
 * antes). */
export async function calcularRiscoCltPessoa(pessoaId: number, empresaId: number): Promise<RiscoCltPessoa | null> {
  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId } },
    select: {
      tipoVinculo: true,
      ativo: true,
      riscoCltDispensadoEm: true,
      pessoa: { select: { nome: true } },
    },
  });
  if (!vinculo || vinculo.tipoVinculo !== "EXTRA" || !vinculo.ativo) return null;

  const inicioSemana = inicioDaSemanaBrasil(new Date());
  const [turnosNaSemana, declaracoes] = await Promise.all([
    prisma.turno.count({ where: { pessoaId, empresaId, horaEntrada: { gte: inicioSemana } } }),
    prisma.documentoGed.findMany({
      where: { empresaId, pessoaId, tipo: "TERMO_CIENCIA" },
      select: { snapshotDados: true },
    }),
  ]);
  const jaTemDeclaracao = declaracoes.some(
    (d) => (d.snapshotDados as unknown as SnapshotTermoCienciaGed).termoSlug === TERMO_SLUG_RISCO_CLT
  );
  if (jaTemDeclaracao) return null;
  if (turnosNaSemana < TURNOS_LIMIAR_RISCO_CLT && vinculo.riscoCltDispensadoEm === null) return null;

  return {
    pessoaId,
    pessoaNome: vinculo.pessoa.nome,
    turnosNaSemana,
    dispensadoEm: vinculo.riscoCltDispensadoEm,
  };
}
