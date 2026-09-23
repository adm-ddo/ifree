import Link from "next/link";
import { requireModulo } from "@/lib/requireModulo";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { pendentePorFrequencia, totalDevido, relatorioPagos, agruparPagamentos, type Agrupamento } from "@/lib/financeiro";

/** Espelho completo de src/app/financeiro/page.tsx (v1, não tocado) —
 * mesmas queries/regras, nenhum componente client aqui (a tela toda é
 * server-rendered), só o visual novo. */
type Preset = "hoje" | "semana" | "mes";

const PRESETS: { valor: Preset; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
];

const AGRUPAMENTOS: { valor: Agrupamento; label: string }[] = [
  { valor: "dia", label: "Por dia" },
  { valor: "semana", label: "Por semana" },
  { valor: "mes", label: "Por mês" },
  { valor: "pessoa", label: "Por pessoa" },
];

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  const fim = agora;
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim };
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim };
  return { inicio: inicioDoMesBrasil(agora), fim };
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

export default async function V2FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; inicio?: string; fim?: string; agrupar?: string }>;
}) {
  const sessao = await requireModulo("financeiro");
  const { preset, inicio, fim, agrupar } = await searchParams;

  const presetValido = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "mes";
  const agrupamentoValido = AGRUPAMENTOS.some((a) => a.valor === agrupar) ? (agrupar as Agrupamento) : "dia";

  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  const [totalAgora, pendentes, linhas] = await Promise.all([
    totalDevido(sessao.empresaEfetivoId),
    pendentePorFrequencia(sessao.empresaEfetivoId),
    relatorioPagos(sessao.empresaEfetivoId, dataInicio, dataFim),
  ]);

  const grupos = agruparPagamentos(linhas, agrupamentoValido);
  const totalPeriodo = linhas.reduce((soma, l) => soma + l.valor, 0);

  function linkPeriodo(p: Preset): string {
    return `/v2/financeiro?preset=${p}&agrupar=${agrupamentoValido}`;
  }

  function linkAgrupamento(a: Agrupamento): string {
    const params = new URLSearchParams();
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else {
      params.set("preset", presetValido);
    }
    params.set("agrupar", a);
    return `/v2/financeiro?${params.toString()}`;
  }

  function pdfHref(): string {
    const params = new URLSearchParams();
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else {
      params.set("preset", presetValido);
    }
    params.set("agrupar", agrupamentoValido);
    return `/financeiro/pdf?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-900">Financeiro</h1>
          <p className="text-stone-500 text-sm mt-0.5">Quanto está devendo agora e o que já foi de fato pago, por período.</p>
        </div>
        <a
          href={pdfHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 text-stone-700 shrink-0"
        >
          🖨️ Baixar PDF
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-navy-900 text-white rounded-2xl p-4">
          <p className="text-2xl font-extrabold">R$ {totalAgora.toFixed(2)}</p>
          <p className="text-xs opacity-70 mt-1">Total devido agora</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-2xl font-extrabold text-navy-900">R$ {pendentes.diaria.toFixed(2)}</p>
          <p className="text-xs text-stone-500 mt-1">Pendente — a cada turno</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-2xl font-extrabold text-navy-900">R$ {pendentes.semanal.toFixed(2)}</p>
          <p className="text-xs text-stone-500 mt-1">Pendente — semanal</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold text-navy-900 mb-1.5 text-[13px]">Período do relatório</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => (
              <Pill key={p.valor} href={linkPeriodo(p.valor)} ativo={!periodoCustomizado && presetValido === p.valor}>
                {p.label}
              </Pill>
            ))}
            <form method="GET" action="/v2/financeiro" className="flex flex-wrap items-center gap-1.5">
              <input type="hidden" name="agrupar" value={agrupamentoValido} />
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
        </div>

        <div>
          <h2 className="font-bold text-navy-900 mb-1.5 text-[13px]">Agrupar por</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {AGRUPAMENTOS.map((a) => (
              <Pill key={a.valor} href={linkAgrupamento(a.valor)} ativo={agrupamentoValido === a.valor}>
                {a.label}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-navy-900 text-[13px]">Pago no período</h2>
          <span className="text-[13px] font-bold text-navy-900">R$ {totalPeriodo.toFixed(2)}</span>
        </div>

        {grupos.length === 0 && <p className="text-stone-500 text-sm">Nenhum pagamento concluído nesse período.</p>}

        <ul className="flex flex-col gap-2">
          {grupos.map((g) => (
            <li key={g.chave} className="rounded-xl bg-white border border-stone-200 p-3.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-[13px] text-navy-900 capitalize">{g.chave}</p>
                <p className="text-[11px] text-stone-500">{g.quantidade} pagamento(s)</p>
              </div>
              <span className="text-[13px] font-bold text-navy-900">R$ {g.valor.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
