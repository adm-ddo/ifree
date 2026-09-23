import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import {
  formatarDataHoraComDiaSemana,
  inicioDoDiaBrasil,
  inicioDaSemanaBrasil,
  inicioDoMesBrasil,
} from "@/lib/data";
import { pendentePorFrequencia, pendentesPorPessoa, proximoDiaPagamento } from "@/lib/financeiro";
import { buscarSaldoAsaas, expirarDepositosVencidos } from "@/lib/pagamentos/asaas-deposito";
import { verificarStatusAsaas } from "@/lib/pagamentos/asaas-conta-status";
import AutoRefresh from "@/components/AutoRefresh";
import PagamentosSelecionaveis from "./PagamentosSelecionaveis";
import SaldoAsaasCard from "./SaldoAsaasCard";
import type { StatusPagamento, FrequenciaPagamento } from "@/generated/prisma/enums";

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

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    frequencia?: string;
    visao?: string;
    preset?: string;
    inicio?: string;
    fim?: string;
  }>;
}) {
  const sessao = await requireModulo("pagamentos");
  const { status, frequencia, visao, preset, inicio, fim } = await searchParams;
  const statusFiltro: StatusFiltroValor = FILTROS.some((f) => f.valor === status)
    ? (status as StatusFiltroValor)
    : "TODOS";
  const frequenciaFiltro = FREQUENCIAS.some((f) => f.valor === frequencia)
    ? (frequencia as FrequenciaPagamento)
    : null;
  // Padrão "por pessoa" — é o que mais ajuda a achar rápido os turnos da
  // mesma pessoa pra agrupar o pagamento (ver agruparEMarcarPagos); quem
  // preferir a lista corrida de sempre pode trocar a qualquer momento.
  const visaoFiltro: Visao = visao === "lista" ? "lista" : "pessoa";

  // Período filtra pelo início do turno (mesma referência usada em "quando"
  // logo abaixo) — "todos os períodos" (padrão) não restringe nada, pra não
  // esconder um pagamento pendente antigo sem querer.
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

  // Card de crédito/depósito só faz sentido pra quem já conectou a conta
  // de pagamento (ver conectarContaAsaas em src/app/configuracoes/actions.ts,
  // aberto a qualquer usuário com acesso à empresa desde 2026-09-07).
  const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({
    where: { empresaId: sessao.empresaEfetivoId },
  });
  // Corrige na hora qualquer depósito PENDENTE cujo PIX já venceu, antes
  // de buscar a lista abaixo — sem isso ele ficaria "Aguardando
  // pagamento" pra sempre (ver expirarDepositosVencidos). Precisa
  // terminar ANTES do findMany, por isso fora do Promise.all de baixo.
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
      ...(statusFiltro === "NAO_PAGOS"
        ? { status: { in: STATUS_NAO_PAGOS } }
        : statusFiltro !== "TODOS"
          ? { status: statusFiltro }
          : {}),
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

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervaloMs={5000} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Pagamentos</h1>
          <p className="text-stone-600 mt-1 text-sm">
            Extras com recebimento diário e conta de pagamento conectada são
            pagos automaticamente (selo 🌐 Online). Os demais aparecem como
            &ldquo;aguardando PIX manual&rdquo; — faça a transferência pelo
            seu banco e clique em &ldquo;Marcar como pago&rdquo; (selo ✋ Manual).
          </p>
        </div>
        <a
          href="/relatorios/pagamentos-semanal/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 shrink-0"
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
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-navy-900">R$ {diaria.toFixed(2)}</p>
          <p className="text-xs text-stone-500 mt-1 mb-3">
            Pendente — a cada turno · pagamentos de turnos já encerrados, prontos pra PIX
          </p>
          {pessoasPendentes.diaria.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-stone-100 pt-2">
              {pessoasPendentes.diaria.map((p) => (
                <li key={p.pessoaId} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-stone-700 truncate">
                    {p.pessoaNome}{" "}
                    <span className="text-stone-400 text-xs">
                      · {p.quantidade} turno{p.quantidade > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="font-medium text-stone-800 shrink-0">R$ {p.valor.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-navy-900">R$ {semanal.toFixed(2)}</p>
          <p className="text-xs text-stone-500 mt-1 mb-3">
            Pendente — semanal · acumulado pra pagar {proximoPagamentoLabel}
          </p>
          {pessoasPendentes.semanal.length > 0 && (
            <ul className="flex flex-col gap-1.5 border-t border-stone-100 pt-2">
              {pessoasPendentes.semanal.map((p) => (
                <li key={p.pessoaId} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-stone-700 truncate">
                    {p.pessoaNome}{" "}
                    <span className="text-stone-400 text-xs">
                      · {p.quantidade} turno{p.quantidade > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="font-medium text-stone-800 shrink-0">R$ {p.valor.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const params = new URLSearchParams();
          if (statusFiltro !== "TODOS") params.set("status", statusFiltro);
          if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
          if (visaoFiltro !== "pessoa") params.set("visao", visaoFiltro);
          if (p.valor !== "todos") params.set("preset", p.valor);
          const query = params.toString();
          return (
            <Link
              key={p.valor}
              href={query ? `/pagamentos?${query}` : "/pagamentos"}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                !periodoCustomizado && presetValido === p.valor
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
        <form method="GET" className="flex flex-wrap items-center gap-2">
          {statusFiltro !== "TODOS" && <input type="hidden" name="status" value={statusFiltro} />}
          {frequenciaFiltro && <input type="hidden" name="frequencia" value={frequenciaFiltro} />}
          {visaoFiltro !== "pessoa" && <input type="hidden" name="visao" value={visaoFiltro} />}
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

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const params = new URLSearchParams();
          if (f.valor !== "TODOS") params.set("status", f.valor);
          if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
          if (visaoFiltro !== "pessoa") params.set("visao", visaoFiltro);
          if (periodoCustomizado) {
            params.set("inicio", inicio!);
            params.set("fim", fim!);
          } else if (presetValido !== "todos") {
            params.set("preset", presetValido);
          }
          const query = params.toString();
          return (
            <Link
              key={f.valor}
              href={query ? `/pagamentos?${query}` : "/pagamentos"}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                statusFiltro === f.valor
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {FREQUENCIAS.map((f) => {
          const params = new URLSearchParams();
          if (statusFiltro !== "TODOS") params.set("status", statusFiltro);
          if (f.valor !== "TODAS") params.set("frequencia", f.valor);
          if (visaoFiltro !== "pessoa") params.set("visao", visaoFiltro);
          if (periodoCustomizado) {
            params.set("inicio", inicio!);
            params.set("fim", fim!);
          } else if (presetValido !== "todos") {
            params.set("preset", presetValido);
          }
          const query = params.toString();
          return (
            <Link
              key={f.valor}
              href={query ? `/pagamentos?${query}` : "/pagamentos"}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                (frequenciaFiltro ?? "TODAS") === f.valor
                  ? "bg-navy-800 text-white border-navy-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {VISOES.map((v) => {
          const params = new URLSearchParams();
          if (statusFiltro !== "TODOS") params.set("status", statusFiltro);
          if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
          if (v.valor !== "pessoa") params.set("visao", v.valor);
          if (periodoCustomizado) {
            params.set("inicio", inicio!);
            params.set("fim", fim!);
          } else if (presetValido !== "todos") {
            params.set("preset", presetValido);
          }
          const query = params.toString();
          return (
            <Link
              key={v.valor}
              href={query ? `/pagamentos?${query}` : "/pagamentos"}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                visaoFiltro === v.valor
                  ? "bg-violet-700 text-white border-violet-700"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      {pagamentos.length === 0 && (
        <p className="text-stone-500 text-sm">Nenhum pagamento encontrado.</p>
      )}

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
