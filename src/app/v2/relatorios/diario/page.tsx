import Link from "next/link";
import { requireModulo } from "@/lib/requireModulo";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil, formatarHora } from "@/lib/data";
import { listarTurnosDiario } from "@/lib/relatorio";
import type { StatusTurno } from "@/generated/prisma/enums";

/** Relatório analítico diário — pedido do Thiago em 2026-10-02: uma lista
 * "crua" de turnos no período, SEM somar por pessoa nem por função (ver
 * listarTurnosDiario em src/lib/relatorio.ts) — bem diferente da home de
 * /v2/relatorios (que já agrega tudo em buckets). Só separa visualmente
 * por dia-calendário, sem quebra de página forçada entre um dia e outro
 * (Thiago topou: "só quero os dias separados visualmente numa lista só").
 * Feature nova, só v2 (ver feedback_v1_congelado_100_v2 nas memórias). */
type Preset = "hoje" | "ontem" | "semana" | "mes";

const PRESETS: { valor: Preset; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "ontem", label: "Ontem" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
];

const STATUS_LABEL: Record<StatusTurno, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

const STATUS_CLASSE: Record<StatusTurno, string> = {
  ABERTO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDO: "bg-amber-50 text-amber-700 border-amber-200",
  PAGO: "bg-brand-50 text-brand-700 border-brand-200",
  ERRO_PAGAMENTO: "bg-red-50 text-red-700 border-red-200",
};

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim: agora };
  if (preset === "ontem") {
    const hoje = inicioDoDiaBrasil(agora);
    return { inicio: new Date(hoje.getTime() - 24 * 60 * 60 * 1000), fim: hoje };
  }
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim: agora };
  return { inicio: inicioDoMesBrasil(agora), fim: agora };
}

function formatarCabecalhoDia(dataISO: string): string {
  // Meio-dia evita qualquer tropeço de fuso horário na borda da meia-noite.
  const data = new Date(`${dataISO}T12:00:00-03:00`);
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(data);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatarHoras(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
}

function Pill({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        ativo ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function RelatorioDiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; inicio?: string; fim?: string }>;
}) {
  const sessao = await requireModulo("relatorios");
  const { preset, inicio, fim } = await searchParams;

  const presetValido = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "mes";
  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  const dias = await listarTurnosDiario(sessao.empresaEfetivoId, dataInicio, dataFim);
  const totalTurnos = dias.reduce((soma, d) => soma + d.turnos.length, 0);
  const totalValor = dias.reduce((soma, d) => soma + d.totalValor, 0);

  function linkPeriodo(p: Preset): string {
    return `/v2/relatorios/diario?preset=${p}`;
  }

  function periodoQuery(): string {
    const params = new URLSearchParams();
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else {
      params.set("preset", presetValido);
    }
    return params.toString();
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-900">Relatório analítico diário</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Todos os turnos do período, dia a dia, sem somar por pessoa nem por função.
          </p>
        </div>
        <a
          href={`/relatorios/diario/pdf?${periodoQuery()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-stone-200 text-xs font-bold px-3 py-2 shrink-0"
        >
          🖨️ Imprimir
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <Pill key={p.valor} href={linkPeriodo(p.valor)} ativo={!periodoCustomizado && presetValido === p.valor}>
            {p.label}
          </Pill>
        ))}
        <form method="GET" action="/v2/relatorios/diario" className="flex flex-wrap items-center gap-1.5">
          <input type="date" name="inicio" defaultValue={inicio ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <span className="text-stone-400 text-xs">até</span>
          <input type="date" name="fim" defaultValue={fim ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <button type="submit" className={`rounded-full border px-3 py-1.5 text-xs font-bold ${periodoCustomizado ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}>
            Período
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-navy-900 text-white rounded-2xl p-4">
          <p className="text-xl font-extrabold">R$ {totalValor.toFixed(2)}</p>
          <p className="text-xs opacity-70 mt-1">Total no período</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-xl font-extrabold text-navy-900">{totalTurnos}</p>
          <p className="text-xs text-stone-500 mt-1">Turnos no período</p>
        </div>
      </div>

      {dias.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum turno encontrado nesse período.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {dias.map((dia) => (
            <div key={dia.dataISO} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-200 pb-1.5">
                <h2 className="font-bold text-navy-900 text-sm">{formatarCabecalhoDia(dia.dataISO)}</h2>
                <p className="text-xs text-stone-500">
                  {dia.turnos.length} turno(s) · {formatarHoras(dia.totalMinutos)} · R$ {dia.totalValor.toFixed(2)}
                </p>
              </div>
              <ul className="flex flex-col gap-1.5">
                {dia.turnos.map((t) => (
                  <li
                    key={t.turnoId}
                    className="rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-[13px] text-navy-900">
                        {t.pessoaNome} <span className="text-stone-400 font-normal">· {t.funcaoNome}</span>
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {formatarHora(t.horaEntrada)}
                        {t.horaSaida ? ` – ${formatarHora(t.horaSaida)}` : ""} · {formatarHoras(t.minutos)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] rounded-full border px-2 py-0.5 ${STATUS_CLASSE[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                      <span className="text-[13px] font-bold text-navy-900">R$ {t.valor.toFixed(2)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
