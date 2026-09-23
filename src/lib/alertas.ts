import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calcularStatusFerias } from "@/lib/ferias";
import { calcularStatusExperiencia } from "@/lib/experiencia";
import { diasParaVencer, GRACA_DIAS } from "@/lib/assinatura";
import { usuarioEhResponsavelEtica } from "@/lib/etica";
import { usuarioEhResponsavelGed } from "@/lib/ged";
import { usuarioEhResponsavelPgr } from "@/lib/pgr";
import { CHAVES_TODOS_MODULOS, filtrarModulosValidos, type ModuloEquipe } from "@/lib/modulosEquipe";

/// Porte completo das funções de aviso do topo de src/app/layout.tsx
/// (v1, NÃO tocado) — usado só pela v2 (src/app/v2/layout.tsx), mesmo
/// espírito de src/lib/dashboard.ts. Cada função mantém seu próprio
/// try/catch (nunca pode derrubar o layout inteiro por causa de um
/// aviso), igual ao original.

export async function buscarPagamentosPendentesAlerta(
  empresaId: number
): Promise<{ _count: number; _sum: { valor: unknown } } | null> {
  try {
    return await prisma.pagamento.aggregate({
      where: { status: { in: ["PENDENTE", "FALHOU"] }, turno: { empresaId } },
      _count: true,
      _sum: { valor: true },
    });
  } catch (err) {
    console.error("Falha ao buscar pagamentos pendentes pro aviso do topo (v2):", err);
    return null;
  }
}

export async function buscarFeriasAlerta(
  empresaId: number
): Promise<{ vencidas: number; vencendoEmBreve: number } | null> {
  try {
    const vinculosClt = await prisma.vinculoPessoaEmpresa.findMany({
      where: { empresaId, tipoVinculo: "CLT", ativo: true, dataAdmissao: { not: null } },
      select: { dataAdmissao: true, ultimasFeriasGozadasEm: true },
    });
    const hoje = new Date();
    let vencidas = 0;
    let vencendoEmBreve = 0;
    for (const v of vinculosClt) {
      const status = calcularStatusFerias(v.dataAdmissao!, v.ultimasFeriasGozadasEm, hoje);
      if (status.fase === "VENCIDA") vencidas++;
      else if (status.fase === "CONCESSIVO" && status.diasRestantes <= 60) vencendoEmBreve++;
    }
    return vencidas > 0 || vencendoEmBreve > 0 ? { vencidas, vencendoEmBreve } : null;
  } catch (err) {
    console.error("Falha ao buscar férias vencendo pro aviso do topo (v2):", err);
    return null;
  }
}

export async function buscarDenunciasNovasAlerta(empresaId: number): Promise<number> {
  try {
    return await prisma.denuncia.count({ where: { empresaId, status: "RECEBIDO" } });
  } catch (err) {
    console.error("Falha ao checar denúncias novas pro aviso do topo (v2):", err);
    return 0;
  }
}

export type CandidaturasEConversasAlerta = {
  candidaturasPendentes: number;
  candidaturasPendentesComMatch: number;
  mensagensConectaNaoLidas: number;
};

export async function buscarCandidaturasEConversasAlerta(empresaId: number): Promise<CandidaturasEConversasAlerta> {
  try {
    const [pendentes, conversas] = await Promise.all([
      prisma.candidatura.findMany({
        where: { status: "ENVIADA", vaga: { empresaId } },
        select: { match: true },
      }),
      prisma.conversa.findMany({
        where: { empresaId },
        select: {
          ultimaLeituraEmpresaEm: true,
          mensagens: {
            where: { autor: "PESSOA" },
            orderBy: { criadoEm: "desc" },
            take: 1,
            select: { criadoEm: true },
          },
        },
      }),
    ]);
    return {
      candidaturasPendentes: pendentes.length,
      candidaturasPendentesComMatch: pendentes.filter((c) => c.match).length,
      mensagensConectaNaoLidas: conversas.filter((c) => {
        const ultima = c.mensagens[0];
        return ultima && (!c.ultimaLeituraEmpresaEm || ultima.criadoEm > c.ultimaLeituraEmpresaEm);
      }).length,
    };
  } catch (err) {
    console.error("Falha ao buscar candidaturas/mensagens do Conecta pro aviso do topo (v2):", err);
    return { candidaturasPendentes: 0, candidaturasPendentesComMatch: 0, mensagensConectaNaoLidas: 0 };
  }
}

export async function buscarExperienciaAlerta(
  empresaId: number
): Promise<{ vencidos: number; vencendoEmBreve: number } | null> {
  try {
    const vinculosExperiencia = await prisma.vinculoPessoaEmpresa.findMany({
      where: {
        empresaId,
        tipoVinculo: "CLT",
        ativo: true,
        dataAdmissao: { not: null },
        experienciaDias1: { not: null },
        experienciaEfetivadoEm: null,
      },
      select: {
        dataAdmissao: true,
        experienciaDias1: true,
        experienciaDias2: true,
        experienciaContinuouEm: true,
        experienciaEfetivadoEm: true,
      },
    });
    const hoje = new Date();
    let vencidos = 0;
    let vencendoEmBreve = 0;
    for (const v of vinculosExperiencia) {
      const status = calcularStatusExperiencia(
        v.dataAdmissao!,
        v.experienciaDias1!,
        v.experienciaDias2,
        v.experienciaContinuouEm,
        v.experienciaEfetivadoEm,
        hoje
      );
      if (status.fase === "VENCIDO") vencidos++;
      else if (status.fase === "ATENCAO") vencendoEmBreve++;
    }
    return vencidos > 0 || vencendoEmBreve > 0 ? { vencidos, vencendoEmBreve } : null;
  } catch (err) {
    console.error("Falha ao buscar contratos de experiência vencendo pro aviso do topo (v2):", err);
    return null;
  }
}

export async function buscarAssinaturaAlerta(
  empresaId: number
): Promise<{ diasRestantes: number; emTrial: boolean; horasParaBloqueio: number | null } | null> {
  try {
    const empresaAssinatura = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { assinaturaVenceEm: true, statusAssinatura: true, avisoVencimentoDias: true },
    });
    if (
      empresaAssinatura?.assinaturaVenceEm &&
      (empresaAssinatura.statusAssinatura === "TRIAL" || empresaAssinatura.statusAssinatura === "ATIVA")
    ) {
      const dias = diasParaVencer(empresaAssinatura.assinaturaVenceEm);
      if (dias <= empresaAssinatura.avisoVencimentoDias) {
        // Só faz sentido contar horas pro bloqueio depois de já vencido —
        // antes disso (dias > 0) o bloqueio nem começou a contar ainda. O
        // bloqueio de verdade acontece quando o cron marca ATRASADA (ver
        // verificarAssinaturasAtrasadas em src/lib/assinatura.ts), que só
        // roda 1x por dia — por isso o horário exato pode variar até um
        // dia a mais do que esse cálculo (o gatilho é pra criar urgência,
        // não uma promessa exata ao segundo).
        let horasParaBloqueio: number | null = null;
        if (dias <= 0) {
          const bloqueioEm = new Date(empresaAssinatura.assinaturaVenceEm);
          bloqueioEm.setDate(bloqueioEm.getDate() + GRACA_DIAS);
          horasParaBloqueio = Math.max(0, Math.ceil((bloqueioEm.getTime() - Date.now()) / (60 * 60 * 1000)));
        }
        return { diasRestantes: dias, emTrial: empresaAssinatura.statusAssinatura === "TRIAL", horasParaBloqueio };
      }
    }
    return null;
  } catch (err) {
    console.error("Falha ao checar vencimento da assinatura pro aviso do topo (v2):", err);
    return null;
  }
}

const DIAS_PERIODICIDADE_PGR = 365;

/** PGR (riscos psicossociais, NR-1) — sinaliza quando a empresa nunca fez
 * nenhum ciclo, ou o último ciclo encerrado já passou de 12 meses (a NR-1
 * exige reavaliação completa no mínimo anual). Só interessa a quem tem
 * responsavelPgr (ver v2/layout.tsx), mesmo espírito do gate de
 * denúncias novas. */
export async function buscarPgrAlerta(empresaId: number): Promise<{ nuncaFez: boolean; diasDesdeUltimoCiclo: number | null } | null> {
  try {
    const ultimoEncerrado = await prisma.cicloPgr.findFirst({
      where: { empresaId, status: "ENCERRADO" },
      orderBy: { encerradoEm: "desc" },
      select: { encerradoEm: true },
    });
    if (!ultimoEncerrado) {
      const jaTemCicloAberto = await prisma.cicloPgr.findFirst({ where: { empresaId, status: "ABERTO" } });
      return jaTemCicloAberto ? null : { nuncaFez: true, diasDesdeUltimoCiclo: null };
    }
    const diasDesde = Math.floor((Date.now() - ultimoEncerrado.encerradoEm!.getTime()) / (24 * 60 * 60 * 1000));
    if (diasDesde >= DIAS_PERIODICIDADE_PGR) {
      return { nuncaFez: false, diasDesdeUltimoCiclo: diasDesde };
    }
    return null;
  } catch (err) {
    console.error("Falha ao checar periodicidade do PGR pro aviso do topo (v2):", err);
    return null;
  }
}

export type DadosLayoutV2 = {
  responsavelEtica: boolean;
  responsavelGed: boolean;
  responsavelPgr: boolean;
  pagamentosPendentes: { quantidade: number; total: number } | null;
  feriasAlerta: { vencidas: number; vencendoEmBreve: number } | null;
  candidaturasEConversas: CandidaturasEConversasAlerta;
  experienciaAlerta: { vencidos: number; vencendoEmBreve: number } | null;
  assinaturaAlerta: { diasRestantes: number; emTrial: boolean; horasParaBloqueio: number | null } | null;
  denunciasNovas: number;
  /// Módulos liberados pro usuário atual nesta empresa (ver
  /// src/lib/modulosEquipe.ts) — usado só pra filtrar a nav (esconder
  /// item que ia dar redirect de qualquer jeito). Master sempre recebe a
  /// lista completa. O bloqueio de verdade nunca depende disto (é
  /// requireModulo, sem cache) — até 20s de atraso aqui é só cosmético,
  /// mesmo raciocínio do resto deste cache (ver buscarDadosLayoutV2).
  modulosPermitidos: ModuloEquipe[];
  pgrAlerta: { nuncaFez: boolean; diasDesdeUltimoCiclo: number | null } | null;
};

async function buscarDadosLayoutV2SemCache(
  usuarioId: number,
  empresaId: number,
  isMaster: boolean
): Promise<DadosLayoutV2> {
  const [
    responsavelEtica,
    responsavelGed,
    responsavelPgr,
    pagamentosPendentesAgg,
    feriasAlerta,
    candidaturasEConversas,
    experienciaAlerta,
    assinaturaAlerta,
  ] = await Promise.all([
    usuarioEhResponsavelEtica(usuarioId, empresaId, isMaster),
    usuarioEhResponsavelGed(usuarioId, empresaId, isMaster),
    usuarioEhResponsavelPgr(usuarioId, empresaId, isMaster),
    buscarPagamentosPendentesAlerta(empresaId),
    buscarFeriasAlerta(empresaId),
    buscarCandidaturasEConversasAlerta(empresaId),
    buscarExperienciaAlerta(empresaId),
    buscarAssinaturaAlerta(empresaId),
  ]);
  // Mesmo motivo do v1: só busca depois de saber responsavelEtica/Pgr, pra
  // não vazar nem a existência de denúncia/PGR pra quem não tem acesso.
  const denunciasNovas = responsavelEtica ? await buscarDenunciasNovasAlerta(empresaId) : 0;
  const pgrAlerta = responsavelPgr ? await buscarPgrAlerta(empresaId) : null;

  let modulosPermitidos: ModuloEquipe[] = CHAVES_TODOS_MODULOS;
  if (!isMaster) {
    const vinculo = await prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
      select: { modulosPermitidos: true },
    });
    modulosPermitidos = filtrarModulosValidos(vinculo?.modulosPermitidos ?? []);
  }

  return {
    responsavelEtica,
    responsavelGed,
    responsavelPgr,
    // Normaliza aqui (nunca devolve o Decimal cru do Prisma) — o resultado
    // desta função passa pelo cache do Next.js abaixo, que precisa de um
    // valor serializável.
    pagamentosPendentes: pagamentosPendentesAgg
      ? { quantidade: pagamentosPendentesAgg._count, total: Number(pagamentosPendentesAgg._sum.valor ?? 0) }
      : null,
    feriasAlerta,
    candidaturasEConversas,
    experienciaAlerta,
    assinaturaAlerta,
    denunciasNovas,
    pgrAlerta,
    modulosPermitidos,
  };
}

/** Junta as permissões (responsavelEtica/Ged/Pgr, que decidem quais itens
 * aparecem na nav) e todos os avisos do topo da v2 (src/app/v2/layout.tsx)
 * numa cache curta — antes disso, TODA troca de tela dentro de /v2/** (o
 * layout roda de novo a cada navegação, já que requireSessao() usa cookies
 * e torna a rota dinâmica) refazia essas ~10 consultas do zero, mesmo pra
 * quem só queria ir do Painel pra Pagamentos. Era a causa real da demora
 * ao trocar de tela reportada pelo Thiago em 2026-09-19 (mais do que
 * qualquer query pesada de uma página específica). 20s de cache é
 * imperceptível pra um badge de aviso (ninguém precisa saber no milissegundo
 * exato que um pagamento ficou pendente) mas já corta a maior parte das
 * consultas repetidas. Um Central de Ética/GED/PGR que aparece/some da nav
 * com até 20s de atraso depois de alternado em /equipe é só um efeito
 * cosmético — o acesso de verdade a cada rota continua protegido por
 * requireResponsavelEtica()/Ged/Pgr, que nunca passa por este cache. */
export function buscarDadosLayoutV2(usuarioId: number, empresaId: number, isMaster: boolean): Promise<DadosLayoutV2> {
  return unstable_cache(
    () => buscarDadosLayoutV2SemCache(usuarioId, empresaId, isMaster),
    ["layout-v2", String(usuarioId), String(empresaId), String(isMaster)],
    { revalidate: 20 }
  )();
}
