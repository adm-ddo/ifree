import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import {
  pendentePorFrequencia,
  totalDevido,
  relatorioPagos,
  agruparPagamentos,
  type Agrupamento,
} from "@/lib/financeiro";

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

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; inicio?: string; fim?: string; agrupar?: string }>;
}) {
  const sessao = await requireTenant();
  const { preset, inicio, fim, agrupar } = await searchParams;

  const presetValido = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "mes";
  const agrupamentoValido = AGRUPAMENTOS.some((a) => a.valor === agrupar)
    ? (agrupar as Agrupamento)
    : "dia";

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
    return `/financeiro?preset=${p}&agrupar=${agrupamentoValido}`;
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
    return `/financeiro?${params.toString()}`;
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Financeiro</h1>
          <p className="text-stone-600 mt-1 text-sm">
            Quanto está devendo agora e o que já foi de fato pago, por
            período.
          </p>
        </div>
        <a
          href={pdfHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 shrink-0"
        >
          🖨️ Baixar PDF
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card label="Total devido agora" valor={`R$ ${totalAgora.toFixed(2)}`} destaque />
        <Card label="Pendente — a cada turno" valor={`R$ ${pendentes.diaria.toFixed(2)}`} />
        <Card label="Pendente — semanal" valor={`R$ ${pendentes.semanal.toFixed(2)}`} />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold text-navy-900 mb-2 text-sm">Período do relatório</h2>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
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
              <input type="hidden" name="agrupar" value={agrupamentoValido} />
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
        </div>

        <div>
          <h2 className="font-semibold text-navy-900 mb-2 text-sm">Agrupar por</h2>
          <div className="flex flex-wrap items-center gap-2">
            {AGRUPAMENTOS.map((a) => (
              <Link
                key={a.valor}
                href={linkAgrupamento(a.valor)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  agrupamentoValido === a.valor
                    ? "bg-stone-800 text-white border-stone-800"
                    : "border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-navy-900">Pago no período</h2>
          <span className="text-sm font-semibold text-stone-700">R$ {totalPeriodo.toFixed(2)}</span>
        </div>

        {grupos.length === 0 && (
          <p className="text-stone-500 text-sm">Nenhum pagamento concluído nesse período.</p>
        )}

        <ul className="flex flex-col gap-2">
          {grupos.map((g) => (
            <li
              key={g.chave}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-navy-900 capitalize">{g.chave}</p>
                <p className="text-xs text-stone-500">
                  {g.quantidade} pagamento(s)
                </p>
              </div>
              <span className="text-sm font-semibold text-stone-700">R$ {g.valor.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Card({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${destaque ? "text-brand-700" : "text-navy-900"}`}>
        {valor}
      </p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}
