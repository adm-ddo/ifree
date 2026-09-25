import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { valorMensalidadeEfetivo, calcularMrr, diasParaVencer } from "@/lib/assinatura";
import { inicioDoMesBrasil } from "@/lib/data";
import { buscarSaldosAsaas } from "@/lib/pagamentos/asaas-deposito";
import AssinaturaCard from "./AssinaturaCard";
import type { StatusAssinatura } from "@/generated/prisma/enums";

const ORDEM_URGENCIA: Record<StatusAssinatura, number> = {
  ATRASADA: 0,
  TRIAL: 1,
  ATIVA: 2,
  CANCELADA: 3,
};

const STATUS_FILTRO_LABEL: Record<StatusAssinatura, string> = {
  TRIAL: "Trial",
  ATIVA: "Ativas",
  ATRASADA: "Atrasadas",
  CANCELADA: "Canceladas",
};

const STATUS_LABEL: Record<StatusAssinatura, string> = {
  TRIAL: "Trial",
  ATIVA: "Ativa",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

const STATUS_CLASSE: Record<StatusAssinatura, string> = {
  TRIAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ATIVA: "bg-brand-50 text-brand-700 border-brand-200",
  ATRASADA: "bg-red-50 text-red-700 border-red-200",
  CANCELADA: "bg-stone-100 text-stone-600 border-stone-200",
};

type PeriodoPreset = "mes" | "mesAnterior";

const PERIODO_PRESETS: { valor: PeriodoPreset; label: string }[] = [
  { valor: "mes", label: "Este mês" },
  { valor: "mesAnterior", label: "Mês anterior" },
];

/** Mesmo truque de "um instante antes do início do mês atual cai no mês
 * passado" usado em outros cálculos de período do projeto. */
function calcularPeriodo(preset: PeriodoPreset, agora: Date): { inicio: Date; fim: Date } {
  const inicioMesAtual = inicioDoMesBrasil(agora);
  if (preset === "mesAnterior") {
    const inicioMesAnterior = inicioDoMesBrasil(new Date(inicioMesAtual.getTime() - 1));
    return { inicio: inicioMesAnterior, fim: inicioMesAtual };
  }
  return { inicio: inicioMesAtual, fim: agora };
}

function formatarDataCurta(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/// Texto + cor da tira de urgência de cada card, a partir de
/// diasParaVencer (src/lib/assinatura.ts) — ATRASADA entra como "atrasado"
/// mesmo se por algum motivo os dias derem positivo (dado desatualizado),
/// já que o status manda mais que a data crua.
function infoVencimento(
  assinaturaVenceEm: Date | null,
  statusAssinatura: StatusAssinatura,
  agora: Date
): { label: string; urgencia: "atrasado" | "atencao" | "normal" } {
  if (!assinaturaVenceEm) return { label: "Sem vencimento definido", urgencia: "normal" };

  const dias = diasParaVencer(assinaturaVenceEm, agora);
  const dataLabel = formatarDataCurta(assinaturaVenceEm);

  if (statusAssinatura === "ATRASADA" || dias < 0) {
    const diasAtraso = Math.abs(dias);
    return {
      label: `Venceu em ${dataLabel} · ${diasAtraso} dia${diasAtraso === 1 ? "" : "s"} atrás`,
      urgencia: "atrasado",
    };
  }
  return {
    label: `Vence em ${dataLabel} · ${dias} dia${dias === 1 ? "" : "s"}`,
    urgencia: dias <= 7 ? "atencao" : "normal",
  };
}

/** Visão de billing separada da lista de usuários/empresas do /master —
 * ordenada por urgência (atrasada primeiro) em vez de por dono, é o
 * "outro portal de controle" que o dono pediu pra acompanhar assinatura
 * de todo mundo de uma vez. */
export default async function MasterAssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; periodo?: string; inicio?: string; fim?: string; q?: string }>;
}) {
  await requireMaster();
  const { status, periodo, inicio, fim, q } = await searchParams;
  const busca = (q ?? "").trim().toLowerCase();

  const statusFiltro = (Object.keys(STATUS_FILTRO_LABEL) as StatusAssinatura[]).includes(
    status as StatusAssinatura
  )
    ? (status as StatusAssinatura)
    : null;

  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const presetValido = periodo === "mesAnterior" ? "mesAnterior" : "mes";
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  function linkStatus(s: StatusAssinatura | null): string {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (busca) params.set("q", q!);
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else if (presetValido !== "mes") {
      params.set("periodo", presetValido);
    }
    const query = params.toString();
    return query ? `/master/assinaturas?${query}` : "/master/assinaturas";
  }

  function linkPeriodo(p: PeriodoPreset): string {
    const params = new URLSearchParams();
    if (statusFiltro) params.set("status", statusFiltro);
    if (busca) params.set("q", q!);
    if (p !== "mes") params.set("periodo", p);
    return `/master/assinaturas?${params.toString()}`;
  }

  const empresas = await prisma.empresa.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      email: true,
      endereco: true,
      numero: true,
      bairro: true,
      cidade: true,
      statusAssinatura: true,
      assinaturaVenceEm: true,
      valorMensalidade: true,
      splitPercentualAsaas: true,
      criadoEm: true,
      tabletFornecido: true,
      tabletValorTotal: true,
      tabletParcelasTotal: true,
      tabletParcelasPagas: true,
      _count: { select: { funcoes: true, turnos: true } },
    },
  });
  const empresaIds = empresas.map((e) => e.id);

  // Última cobrança de cada empresa + saldo Asaas de cada uma — as duas são
  // independentes entre si (e da lista de empresas em si), rodam juntas.
  const [cobrancas, saldosAsaas] = await Promise.all([
    prisma.cobrancaMensalidade.findMany({
      where: { empresaId: { in: empresaIds } },
      orderBy: { criadoEm: "desc" },
      select: { empresaId: true, status: true, valor: true, pagoEm: true, criadoEm: true },
    }),
    buscarSaldosAsaas(empresaIds),
  ]);
  const ultimaCobrancaPorEmpresa = new Map<number, (typeof cobrancas)[number]>();
  for (const c of cobrancas) {
    if (!ultimaCobrancaPorEmpresa.has(c.empresaId)) ultimaCobrancaPorEmpresa.set(c.empresaId, c);
  }

  const ordenadas = [...empresas].sort(
    (a, b) => ORDEM_URGENCIA[a.statusAssinatura] - ORDEM_URGENCIA[b.statusAssinatura]
  );
  const filtradasPorStatus = statusFiltro
    ? ordenadas.filter((e) => e.statusAssinatura === statusFiltro)
    : ordenadas;
  const buscaDigitos = busca.replace(/\D/g, "");
  const visiveis = busca
    ? filtradasPorStatus.filter(
        (e) =>
          e.nome.toLowerCase().includes(busca) ||
          (buscaDigitos.length > 0 && e.cnpj.replace(/\D/g, "").includes(buscaDigitos))
      )
    : filtradasPorStatus;

  // Financeiro do período: "gerado" olha criadoEm (emissão), "recebido"
  // olha pagoEm (só cobranças PAGA) — mesma distinção emissão/recebimento
  // de qualquer relatório de caixa.
  const cobrancasNoPeriodo = cobrancas.filter((c) => c.criadoEm >= dataInicio && c.criadoEm <= dataFim);
  const financeiro = {
    totalGerado: cobrancasNoPeriodo.reduce((soma, c) => soma + Number(c.valor), 0),
    totalRecebido: cobrancas
      .filter((c) => c.status === "PAGA" && c.pagoEm && c.pagoEm >= dataInicio && c.pagoEm <= dataFim)
      .reduce((soma, c) => soma + Number(c.valor), 0),
    qtdPendente: cobrancasNoPeriodo.filter((c) => c.status === "PENDENTE").length,
    qtdExpirada: cobrancasNoPeriodo.filter((c) => c.status === "EXPIRADA").length,
  };

  // Gestão de lojas do período: Empresa.statusAssinatura é só o valor
  // ATUAL (não existe log de mudança de status), então o que dá pra
  // mostrar sobre "o que aconteceu no período" é só quem entrou
  // (criadoEm) e quem tem vencimento caindo na janela — cada um já com o
  // status atual ao lado.
  const novosClientes = empresas.filter((e) => e.criadoEm >= dataInicio && e.criadoEm <= dataFim);
  const vencimentosNoPeriodo = empresas.filter(
    (e) => e.assinaturaVenceEm && e.assinaturaVenceEm >= dataInicio && e.assinaturaVenceEm <= dataFim
  );

  const mrr = calcularMrr(
    empresas.map((e) => ({
      statusAssinatura: e.statusAssinatura,
      valorMensalidade: e.valorMensalidade !== null ? Number(e.valorMensalidade) : null,
    }))
  );
  const resumo = {
    trial: empresas.filter((e) => e.statusAssinatura === "TRIAL").length,
    ativa: empresas.filter((e) => e.statusAssinatura === "ATIVA").length,
    atrasada: empresas.filter((e) => e.statusAssinatura === "ATRASADA").length,
    cancelada: empresas.filter((e) => e.statusAssinatura === "CANCELADA").length,
    mrrReal: mrr.real,
    mrrPotencial: mrr.potencial,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/master" className="text-sm text-brand-700 hover:underline">
          ← Painel Master
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Assinaturas</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Status de cobrança de cada empresa cadastrada no sistema.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <ResumoCard label="Em trial" valor={resumo.trial} />
        <ResumoCard label="Em dia" valor={resumo.ativa} />
        <ResumoCard label="Atrasadas" valor={resumo.atrasada} />
        <ResumoCard label="Canceladas" valor={resumo.cancelada} />
        <ResumoCard label="MRR real" valor={`R$ ${resumo.mrrReal.toFixed(2)}`} />
        <ResumoCard label="MRR potencial (com trial)" valor={`R$ ${resumo.mrrPotencial.toFixed(2)}`} />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-navy-900 mr-1">No período:</span>
          {PERIODO_PRESETS.map((p) => (
            <Link
              key={p.valor}
              href={linkPeriodo(p.valor)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                !periodoCustomizado && presetValido === p.valor
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {p.label}
            </Link>
          ))}
          <form method="GET" className="flex flex-wrap items-center gap-2">
            {statusFiltro && <input type="hidden" name="status" value={statusFiltro} />}
            <input
              type="date"
              name="inicio"
              defaultValue={inicio ?? ""}
              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-stone-400 text-sm">até</span>
            <input
              type="date"
              name="fim"
              defaultValue={fim ?? ""}
              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                periodoCustomizado
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              Período
            </button>
          </form>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Financeiro</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-stone-50 px-3 py-2">
                <p className="text-stone-500 text-xs">Gerado</p>
                <p className="font-medium text-navy-900">R$ {financeiro.totalGerado.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-stone-50 px-3 py-2">
                <p className="text-stone-500 text-xs">Recebido</p>
                <p className="font-medium text-brand-700">R$ {financeiro.totalRecebido.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-stone-50 px-3 py-2">
                <p className="text-stone-500 text-xs">Pendentes</p>
                <p className="font-medium text-navy-900">{financeiro.qtdPendente}</p>
              </div>
              <div className="rounded-lg bg-stone-50 px-3 py-2">
                <p className="text-stone-500 text-xs">Expiradas</p>
                <p className="font-medium text-navy-900">{financeiro.qtdExpirada}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Gestão de lojas</p>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-stone-500 text-xs mb-1">
                  Novos clientes no período ({novosClientes.length})
                </p>
                {novosClientes.length === 0 ? (
                  <p className="text-stone-400 text-xs">Nenhum.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {novosClientes.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-navy-900">
                          {e.nome} <span className="text-stone-400">· {e.cnpj}</span>
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 shrink-0 ${STATUS_CLASSE[e.statusAssinatura]}`}
                        >
                          {STATUS_LABEL[e.statusAssinatura]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-stone-500 text-xs mb-1">
                  Vencimentos no período ({vencimentosNoPeriodo.length})
                </p>
                {vencimentosNoPeriodo.length === 0 ? (
                  <p className="text-stone-400 text-xs">Nenhum.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {vencimentosNoPeriodo.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-navy-900">
                          {e.nome} <span className="text-stone-400">· {formatarDataCurta(e.assinaturaVenceEm!)}</span>
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 shrink-0 ${STATUS_CLASSE[e.statusAssinatura]}`}
                        >
                          {STATUS_LABEL[e.statusAssinatura]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={linkStatus(null)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              !statusFiltro
                ? "bg-stone-800 text-white border-stone-800"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            Todas
          </Link>
          {(Object.entries(STATUS_FILTRO_LABEL) as [StatusAssinatura, string][]).map(([valor, label]) => (
            <Link
              key={valor}
              href={linkStatus(valor)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                statusFiltro === valor
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <form method="GET" className="flex items-center gap-2">
          {statusFiltro && <input type="hidden" name="status" value={statusFiltro} />}
          {periodoCustomizado ? (
            <>
              <input type="hidden" name="inicio" value={inicio} />
              <input type="hidden" name="fim" value={fim} />
            </>
          ) : (
            presetValido !== "mes" && <input type="hidden" name="periodo" value={presetValido} />
          )}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome ou CNPJ..."
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
          />
        </form>
      </div>

      {visiveis.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma empresa encontrada com esse filtro.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiveis.map((empresa) => {
            const ultima = ultimaCobrancaPorEmpresa.get(empresa.id) ?? null;
            const saldo = saldosAsaas.get(empresa.id);
            const { label: vencimentoLabel, urgencia } = infoVencimento(
              empresa.assinaturaVenceEm,
              empresa.statusAssinatura,
              agora
            );
            return (
              <AssinaturaCard
                key={empresa.id}
                valorMensalidadePadrao={valorMensalidadeEfetivo(null)}
                vencimentoLabel={vencimentoLabel}
                urgencia={urgencia}
                saldoAsaas={
                  saldo === undefined ? { tipo: "semConta" } : saldo === null ? { tipo: "indisponivel" } : { tipo: "valor", valor: saldo }
                }
                empresa={{
                  id: empresa.id,
                  nome: empresa.nome,
                  cnpj: empresa.cnpj,
                  email: empresa.email,
                  endereco: empresa.endereco,
                  numero: empresa.numero,
                  bairro: empresa.bairro,
                  cidade: empresa.cidade,
                  funcoesCount: empresa._count.funcoes,
                  turnosCount: empresa._count.turnos,
                  statusAssinatura: empresa.statusAssinatura,
                  assinaturaVenceEm: empresa.assinaturaVenceEm
                    ? empresa.assinaturaVenceEm.toISOString().slice(0, 10)
                    : "",
                  valorMensalidade:
                    empresa.valorMensalidade !== null ? Number(empresa.valorMensalidade) : null,
                  splitPercentualAsaas:
                    empresa.splitPercentualAsaas !== null ? Number(empresa.splitPercentualAsaas) : null,
                  tabletFornecido: empresa.tabletFornecido,
                  tabletValorTotal:
                    empresa.tabletValorTotal !== null ? Number(empresa.tabletValorTotal) : null,
                  tabletParcelasTotal: empresa.tabletParcelasTotal,
                  tabletParcelasPagas: empresa.tabletParcelasPagas,
                }}
                ultimaCobranca={
                  ultima
                    ? {
                        status: ultima.status,
                        valor: Number(ultima.valor),
                        dataLabel: (ultima.pagoEm ?? ultima.criadoEm).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        }),
                      }
                    : null
                }
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ResumoCard({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-navy-900">{valor}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}
