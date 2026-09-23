import Link from "next/link";
import { requireModulo } from "@/lib/requireModulo";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { agregarCustoPorFuncao } from "@/lib/relatorio";
import type { FrequenciaPagamento } from "@/generated/prisma/enums";

/** Espelho completo de src/app/relatorios/page.tsx (v1, não tocado) —
 * mesma query/regra, sem componentes client. O link de cada pessoa vai
 * pro /v2/freelancers/[id]. */
type Preset = "hoje" | "ontem" | "semana" | "mes";

const PRESETS: { valor: Preset; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "ontem", label: "Ontem" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
];

const FREQUENCIAS: { valor: FrequenciaPagamento | "TODAS"; label: string }[] = [
  { valor: "TODAS", label: "Todas as frequências" },
  { valor: "DIARIA", label: "Recebem por dia" },
  { valor: "SEMANAL", label: "Recebem semanal" },
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

const PESSOAS_POR_PAGINA = 10;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function Pill({ href, ativo, cor, children }: { href: string; ativo: boolean; cor: string; children: React.ReactNode }) {
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

export default async function V2RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; inicio?: string; fim?: string; frequencia?: string; ordenar?: string; busca?: string; pagina?: string }>;
}) {
  const sessao = await requireModulo("relatorios");
  const { preset, inicio, fim, frequencia, ordenar, busca, pagina } = await searchParams;

  const presetValido = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "mes";
  const frequenciaFiltro = FREQUENCIAS.some((f) => f.valor === frequencia) ? (frequencia as FrequenciaPagamento) : null;
  const ordenarPor = ordenar === "horas" ? "horas" : "valor";
  const buscaValor = busca ?? "";

  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  const { totalMinutos, totalValor, totalTurnos, porFuncao, porPessoaFuncao } = await agregarCustoPorFuncao(
    sessao.empresaEfetivoId,
    dataInicio,
    dataFim,
    frequenciaFiltro ?? undefined
  );

  const listaPorFuncao = porFuncao;
  const listaPorPessoaCompleta = [...porPessoaFuncao].sort((a, b) => (ordenarPor === "horas" ? b.minutos - a.minutos : b.valor - a.valor));

  const buscaNormalizada = normalizar(buscaValor);
  const listaPorPessoaFiltrada = buscaNormalizada
    ? listaPorPessoaCompleta.filter((p) => normalizar(p.pessoaNome).includes(buscaNormalizada))
    : listaPorPessoaCompleta;

  const totalPaginas = Math.max(1, Math.ceil(listaPorPessoaFiltrada.length / PESSOAS_POR_PAGINA));
  const paginaAtual = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  const listaPorPessoa = listaPorPessoaFiltrada.slice((paginaAtual - 1) * PESSOAS_POR_PAGINA, paginaAtual * PESSOAS_POR_PAGINA);

  function formatarHoras(minutos: number): string {
    return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
  }

  function linkPeriodo(p: Preset): string {
    const params = new URLSearchParams();
    params.set("preset", p);
    if (ordenar) params.set("ordenar", ordenar);
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    return `/v2/relatorios?${params.toString()}`;
  }

  function linkFrequencia(valor: FrequenciaPagamento | "TODAS"): string {
    const params = new URLSearchParams();
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else {
      params.set("preset", presetValido);
    }
    if (ordenar) params.set("ordenar", ordenar);
    if (valor !== "TODAS") params.set("frequencia", valor);
    return `/v2/relatorios?${params.toString()}`;
  }

  function linkPessoas(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else {
      params.set("preset", presetValido);
    }
    params.set("ordenar", ordenarPor);
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    if (buscaValor) params.set("busca", buscaValor);
    if (paginaAtual > 1) params.set("pagina", String(paginaAtual));

    for (const [chave, valor] of Object.entries(overrides)) {
      if (valor === undefined) params.delete(chave);
      else params.set(chave, valor);
    }
    return `/v2/relatorios?${params.toString()}`;
  }

  function periodoQuery(): string {
    const params = new URLSearchParams();
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else {
      params.set("preset", presetValido);
    }
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    return params.toString();
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-900">Relatórios</h1>
          <p className="text-stone-500 text-sm mt-0.5">Quanto os extras estão custando pra empresa, por período e por função.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <a href={`/relatorios/pdf?${periodoQuery()}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-stone-200 text-xs font-bold px-3 py-2">
            🖨️ Imprimir tudo
          </a>
          <Link href="/v2/relatorios/horas" className="rounded-full border border-stone-200 text-xs font-bold px-3 py-2">
            🕐 Horas dos funcionários (CLT)
          </Link>
          <Link href="/v2/relatorios/resumo" className="rounded-full border border-stone-200 text-xs font-bold px-3 py-2">
            📊 Resumo semanal/mensal (extra + CLT)
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <Pill key={p.valor} href={linkPeriodo(p.valor)} ativo={!periodoCustomizado && presetValido === p.valor} cor="bg-navy-900">
            {p.label}
          </Pill>
        ))}
        <form method="GET" action="/v2/relatorios" className="flex flex-wrap items-center gap-1.5">
          {frequenciaFiltro && <input type="hidden" name="frequencia" value={frequenciaFiltro} />}
          <input type="date" name="inicio" defaultValue={inicio ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <span className="text-stone-400 text-xs">até</span>
          <input type="date" name="fim" defaultValue={fim ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <button type="submit" className={`rounded-full border px-3 py-1.5 text-xs font-bold ${periodoCustomizado ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}>
            Período
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FREQUENCIAS.map((f) => (
          <Pill key={f.valor} href={linkFrequencia(f.valor)} ativo={(frequenciaFiltro ?? "TODAS") === f.valor} cor="bg-indigo-600">
            {f.label}
          </Pill>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-navy-900 text-white rounded-2xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xl font-extrabold">R$ {totalValor.toFixed(2)}</p>
          <p className="text-xs opacity-70 mt-1">Custo total (PIX)</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-xl font-extrabold text-navy-900">{formatarHoras(totalMinutos)}</p>
          <p className="text-xs text-stone-500 mt-1">Horas trabalhadas</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-xl font-extrabold text-navy-900">{totalTurnos}</p>
          <p className="text-xs text-stone-500 mt-1">Turnos no período</p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-bold text-navy-900 text-[13px]">Custo por função</h2>
          <a href={`/relatorios/funcao/pdf?${periodoQuery()}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-brand-700">
            🖨️ Imprimir por função
          </a>
        </div>
        {listaPorFuncao.length === 0 && <p className="text-stone-500 text-sm">Nenhum turno pago nesse período.</p>}
        <ul className="flex flex-col gap-2">
          {listaPorFuncao.map((f) => (
            <li key={f.funcaoId} className="rounded-xl bg-white border border-stone-200 p-3.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-[13px] text-navy-900">{f.nome}</p>
                <p className="text-[11px] text-stone-500">{f.turnos} turno(s) · {formatarHoras(f.minutos)}</p>
              </div>
              <span className="text-[13px] font-bold text-navy-900">R$ {f.valor.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-bold text-navy-900 text-[13px]">Por pessoa</h2>
          <div className="flex gap-1.5 text-[11px]">
            <Pill href={linkPessoas({ ordenar: "valor", pagina: undefined })} ativo={ordenarPor === "valor"} cor="bg-navy-900">
              Por valor
            </Pill>
            <Pill href={linkPessoas({ ordenar: "horas", pagina: undefined })} ativo={ordenarPor === "horas"} cor="bg-navy-900">
              Por horas
            </Pill>
          </div>
        </div>

        <form method="GET" action="/v2/relatorios" className="flex flex-wrap items-center gap-2 mb-3">
          {periodoCustomizado ? (
            <>
              <input type="hidden" name="inicio" value={inicio} />
              <input type="hidden" name="fim" value={fim} />
            </>
          ) : (
            <input type="hidden" name="preset" value={presetValido} />
          )}
          <input type="hidden" name="ordenar" value={ordenarPor} />
          <input type="text" name="busca" defaultValue={buscaValor} placeholder="Buscar pessoa pelo nome..." className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm w-full max-w-xs" />
          <button type="submit" className="rounded-full border border-stone-200 text-stone-600 px-3 py-1.5 text-xs font-bold">
            Buscar
          </button>
          {buscaValor && (
            <Link href={linkPessoas({ busca: undefined, pagina: undefined })} className="text-xs text-stone-500">
              Limpar busca
            </Link>
          )}
        </form>

        {listaPorPessoaFiltrada.length === 0 && (
          <p className="text-stone-500 text-sm">{buscaValor ? `Nenhuma pessoa encontrada com "${buscaValor}" nesse período.` : "Nenhum turno pago nesse período."}</p>
        )}
        <ul className="flex flex-col gap-2">
          {listaPorPessoa.map((p, i) => (
            <li key={i} className="rounded-xl bg-white border border-stone-200 p-3.5 flex items-center justify-between">
              <div>
                <Link href={`/v2/freelancers/${p.pessoaId}`} className="font-bold text-[13px] text-navy-900 hover:underline">
                  {p.pessoaNome}
                </Link>
                <p className="text-[11px] text-stone-500">{p.funcaoNome} · {p.turnos} turno(s) · {formatarHoras(p.minutos)}</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[13px] font-bold text-navy-900">R$ {p.valor.toFixed(2)}</span>
                <a href={`/relatorios/pessoa/${p.pessoaId}/pdf?${periodoQuery()}`} target="_blank" rel="noopener noreferrer" title={`Imprimir relatório de ${p.pessoaNome}`} className="text-xs">
                  🖨️
                </a>
              </div>
            </li>
          ))}
        </ul>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 text-xs">
            <Link
              href={linkPessoas({ pagina: String(Math.max(1, paginaAtual - 1)) })}
              className={`rounded-full border px-3 py-1.5 border-stone-200 text-stone-600 ${paginaAtual === 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              ← Anterior
            </Link>
            <span className="text-stone-500">Página {paginaAtual} de {totalPaginas}</span>
            <Link
              href={linkPessoas({ pagina: String(Math.min(totalPaginas, paginaAtual + 1)) })}
              className={`rounded-full border px-3 py-1.5 border-stone-200 text-stone-600 ${paginaAtual === totalPaginas ? "pointer-events-none opacity-40" : ""}`}
            >
              Próxima →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
