import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { formatarDataHoraComDiaSemana, inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { pendentePorFrequencia, pendentesPorPessoa, proximoDiaPagamento } from "@/lib/financeiro";
import { buscarSaldoAsaas, expirarDepositosVencidos } from "@/lib/pagamentos/asaas-deposito";
import { verificarStatusAsaas } from "@/lib/pagamentos/asaas-conta-status";
import AutoRefresh from "@/components/AutoRefresh";
import PagamentosSelecionaveis from "@/app/pagamentos/PagamentosSelecionaveis";
import SaldoAsaasCard from "@/app/pagamentos/SaldoAsaasCard";
import type { StatusPagamento, FrequenciaPagamento } from "@/generated/prisma/enums";

/** Espelho completo de src/app/pagamentos/page.tsx (v1, não tocado) —
 * mesmas queries/regras (filtros de status/frequência/período, visão por
 * pessoa vs. lista corrida, saldo Asaas), reaproveitando
 * PagamentosSelecionaveis/PagamentoRow/SaldoAsaasCard sem alteração (já
 * são cartões brancos genéricos). Só o cabeçalho/pílulas de filtro e os
 * cartões de resumo ganharam o visual novo. */
type StatusFiltroValor = "TODOS" | "NAO_PAGOS" | StatusPagamento;
const STATUS_NAO_PAGOS: StatusPagamento[] = ["PENDENTE", "FALHOU", "PROCESSANDO"];

const FILTROS: { valor: StatusFiltroValor; label: string }[] = [
  { valor: "TODOS", label: "Todos" },
  { valor: "NAO_PAGOS", label: "Não pagos" },
  { valor: "PENDENTE", label: "Aguardando PIX manual" },
  { valor: "FALHOU", label: "Falharam" },
  { valor: "PROCESSANDO", label: "Processando" },
  { valor: "CONCLUIDO", label: "Pagos" },
  { valor: "CANCELADO", label: "Dispensados" },
];

type Preset = "todos" | "hoje" | "ontem" | "semana" | "mes";
const PRESETS: { valor: Preset; label: string }[] = [
  { valor: "todos", label: "Todos os períodos" },
  { valor: "hoje", label: "Hoje" },
  { valor: "ontem", label: "Ontem" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
];

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim: agora };
  if (preset === "ontem") {
    const hoje = inicioDoDiaBrasil(agora);
    return { inicio: new Date(hoje.getTime() - 24 * 60 * 60 * 1000), fim: hoje };
  }
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim: agora };
  return { inicio: inicioDoMesBrasil(agora), fim: agora };
}

const FREQUENCIAS: { valor: FrequenciaPagamento | "TODAS"; label: string }[] = [
  { valor: "TODAS", label: "Todas as frequências" },
  { valor: "DIARIA", label: "Diária" },
  { valor: "SEMANAL", label: "Semanal" },
];

type Visao = "pessoa" | "lista";
const VISOES: { valor: Visao; label: string }[] = [
  { valor: "pessoa", label: "👥 Agrupado por pessoa" },
  { valor: "lista", label: "📋 Lista corrida" },
];

function PillLink({ href, ativo, cor, children }: { href: string; ativo: boolean; cor: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        ativo ? `${cor} text-white border-transparent` : "border-stone-200 bg-white text-stone-600"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function V2PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; frequencia?: string; visao?: string; preset?: string; inicio?: string; fim?: string }>;
}) {
  const sessao = await requireModulo("pagamentos");
  const { status, frequencia, visao, preset, inicio, fim } = await searchParams;
  const statusFiltro: StatusFiltroValor = FILTROS.some((f) => f.valor === status) ? (status as StatusFiltroValor) : "TODOS";
  const frequenciaFiltro = FREQUENCIAS.some((f) => f.valor === frequencia) ? (frequencia as FrequenciaPagamento) : null;
  const visaoFiltro: Visao = visao === "lista" ? "lista" : "pessoa";

  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const presetValido: Preset = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "todos";
  const temFiltroPeriodo = periodoCustomizado || presetValido !== "todos";
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido === "todos" ? "hoje" : presetValido, agora);

  const [{ diaria, semanal }, pessoasPendentes, empresa] = await Promise.all([
    pendentePorFrequencia(sessao.empresaEfetivoId),
    pendentesPorPessoa(sessao.empresaEfetivoId),
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: { semanaPagamentoDia: true, splitPercentualAsaas: true },
    }),
  ]);
  const dataProximoPagamento = proximoDiaPagamento(new Date(), empresa.semanaPagamentoDia);
  const proximoPagamentoLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(dataProximoPagamento);

  const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({ where: { empresaId: sessao.empresaEfetivoId } });
  // Corrige na hora qualquer depósito PENDENTE cujo PIX já venceu, antes
  // de buscar a lista abaixo — ver expirarDepositosVencidos.
  if (contaAsaas) await expirarDepositosVencidos(sessao.empresaEfetivoId!);
  const [saldoAsaas, depositosAsaas, statusAsaasLive] = contaAsaas
    ? await Promise.all([
        buscarSaldoAsaas(sessao.empresaEfetivoId!),
        prisma.depositoAsaas.findMany({
          where: { empresaId: sessao.empresaEfetivoId! },
          orderBy: { criadoEm: "desc" },
          take: 5,
          select: { id: true, valor: true, status: true, criadoEm: true },
        }),
        verificarStatusAsaas(sessao.empresaEfetivoId!),
      ])
    : [null, [], null];

  const pagamentos = await prisma.pagamento.findMany({
    where: {
      turno: {
        empresaId: sessao.empresaEfetivoId,
        ...(frequenciaFiltro ? { frequenciaPagamentoAplicada: frequenciaFiltro } : {}),
        ...(temFiltroPeriodo ? { horaEntrada: { gte: dataInicio, lte: dataFim } } : {}),
      },
      ...(statusFiltro === "NAO_PAGOS" ? { status: { in: STATUS_NAO_PAGOS } } : statusFiltro !== "TODOS" ? { status: statusFiltro } : {}),
    },
    orderBy: { atualizadoEm: "desc" },
    take: 100,
    select: {
      turnoId: true,
      valor: true,
      status: true,
      tentativas: true,
      erro: true,
      chavePixDestino: true,
      tipoChavePixDestino: true,
      grupoPagamentoId: true,
      pagoAutomaticamente: true,
      turno: { select: { pessoa: { select: { id: true, nome: true } }, horaEntrada: true } },
    },
  });

  const BASE = "/v2/pagamentos";
  function montarQuery(overrides: { status?: string; frequencia?: string | null; visao?: string; preset?: string; inicio?: string; fim?: string }) {
    const params = new URLSearchParams();
    const s = overrides.status ?? statusFiltro;
    const f = overrides.frequencia !== undefined ? overrides.frequencia : frequenciaFiltro;
    const v = overrides.visao ?? visaoFiltro;
    if (s !== "TODOS") params.set("status", s);
    if (f) params.set("frequencia", f);
    if (v !== "pessoa") params.set("visao", v);
    if (overrides.inicio && overrides.fim) {
      params.set("inicio", overrides.inicio);
      params.set("fim", overrides.fim);
    } else if (overrides.preset && overrides.preset !== "todos") {
      params.set("preset", overrides.preset);
    } else if (!overrides.inicio && !overrides.preset) {
      if (periodoCustomizado) {
        params.set("inicio", inicio!);
        params.set("fim", fim!);
      } else if (presetValido !== "todos") {
        params.set("preset", presetValido);
      }
    }
    const query = params.toString();
    return query ? `${BASE}?${query}` : BASE;
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* 15s em vez dos 5s originais — mesmo ajuste do /v2/dashboard (ver
          comentário lá). */}
      <AutoRefresh intervaloMs={15000} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-900">Pagamentos</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Extras com recebimento diário e conta de pagamento conectada são pagos automaticamente (selo 🌐
            Online). Os demais aparecem como &ldquo;aguardando PIX manual&rdquo; — faça a transferência pelo seu
            banco e clique em &ldquo;Marcar como pago&rdquo; (selo ✋ Manual).
          </p>
        </div>
        <a
          href="/relatorios/pagamentos-semanal/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 text-stone-700 shrink-0"
        >
          🖨️ Relatório semanal
        </a>
      </div>

      {contaAsaas && (
        <SaldoAsaasCard
          saldo={saldoAsaas}
          depositosRecentes={depositosAsaas.map((d) => ({ ...d, valor: Number(d.valor) }))}
          pixLiberado={statusAsaasLive?.pixLiberado ?? null}
          splitPercentualAsaas={empresa.splitPercentualAsaas !== null ? Number(empresa.splitPercentualAsaas) : 0}
          producao={(process.env.ASAAS_API_BASE_URL ?? "").includes("api.asaas.com")}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-navy-900 text-white rounded-2xl p-4">
          <p className="text-2xl font-extrabold">R$ {diaria.toFixed(2)}</p>
          <p className="text-xs opacity-70 mt-1 mb-3">Pendente — a cada turno · turnos já encerrados, prontos pra PIX</p>
          {pessoasPendentes.diaria.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-white/15 pt-2">
              {pessoasPendentes.diaria.map((p) => (
                <li key={p.pessoaId} className="flex items-center justify-between text-xs gap-2">
                  <span className="opacity-85 truncate">
                    {p.pessoaNome} <span className="opacity-60">· {p.quantidade} turno{p.quantidade > 1 ? "s" : ""}</span>
                  </span>
                  <span className="font-bold shrink-0">R$ {p.valor.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-2xl font-extrabold text-navy-900">R$ {semanal.toFixed(2)}</p>
          <p className="text-xs text-stone-500 mt-1 mb-3">Pendente — semanal · acumulado pra pagar {proximoPagamentoLabel}</p>
          {pessoasPendentes.semanal.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-stone-100 pt-2">
              {pessoasPendentes.semanal.map((p) => (
                <li key={p.pessoaId} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-stone-600 truncate">
                    {p.pessoaNome} <span className="text-stone-400">· {p.quantidade} turno{p.quantidade > 1 ? "s" : ""}</span>
                  </span>
                  <span className="font-bold text-navy-900 shrink-0">R$ {p.valor.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <PillLink key={p.valor} href={montarQuery({ preset: p.valor, inicio: undefined, fim: undefined })} ativo={!periodoCustomizado && presetValido === p.valor} cor="bg-navy-900">
            {p.label}
          </PillLink>
        ))}
        <form method="GET" action={BASE} className="flex flex-wrap items-center gap-1.5">
          {statusFiltro !== "TODOS" && <input type="hidden" name="status" value={statusFiltro} />}
          {frequenciaFiltro && <input type="hidden" name="frequencia" value={frequenciaFiltro} />}
          {visaoFiltro !== "pessoa" && <input type="hidden" name="visao" value={visaoFiltro} />}
          <input type="date" name="inicio" defaultValue={inicio ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <span className="text-stone-400 text-xs">até</span>
          <input type="date" name="fim" defaultValue={fim ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <button
            type="submit"
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${periodoCustomizado ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}
          >
            Período
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <PillLink key={f.valor} href={montarQuery({ status: f.valor })} ativo={statusFiltro === f.valor} cor="bg-navy-900">
            {f.label}
          </PillLink>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FREQUENCIAS.map((f) => (
          <PillLink key={f.valor} href={montarQuery({ frequencia: f.valor === "TODAS" ? null : f.valor })} ativo={(frequenciaFiltro ?? "TODAS") === f.valor} cor="bg-indigo-600">
            {f.label}
          </PillLink>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {VISOES.map((v) => (
          <PillLink key={v.valor} href={montarQuery({ visao: v.valor })} ativo={visaoFiltro === v.valor} cor="bg-violet-600">
            {v.label}
          </PillLink>
        ))}
      </div>

      {pagamentos.length === 0 && <p className="text-stone-500 text-sm">Nenhum pagamento encontrado.</p>}

      {pagamentos.length > 0 && (
        <PagamentosSelecionaveis
          agruparPorPessoa={visaoFiltro === "pessoa"}
          pagamentos={pagamentos.map((p) => ({
            turnoId: p.turnoId,
            pessoaId: p.turno.pessoa.id,
            pessoaNome: p.turno.pessoa.nome,
            valor: Number(p.valor),
            status: p.status,
            tentativas: p.tentativas,
            erro: p.erro,
            chavePixDestino: p.chavePixDestino,
            tipoChavePixDestino: p.tipoChavePixDestino,
            quando: formatarDataHoraComDiaSemana(p.turno.horaEntrada),
            quandoOrdenacao: p.turno.horaEntrada.getTime(),
            grupoPagamentoId: p.grupoPagamentoId,
            pagoAutomaticamente: p.pagoAutomaticamente,
          }))}
        />
      )}
    </div>
  );
}
