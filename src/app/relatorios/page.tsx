import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { agregarCustoPorFuncao } from "@/lib/relatorio";
import type { FrequenciaPagamento } from "@/generated/prisma/enums";

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

/** Minúsculo + sem acento, pra busca não depender de acentuação exata. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    inicio?: string;
    fim?: string;
    frequencia?: string;
    ordenar?: string;
    busca?: string;
    pagina?: string;
  }>;
}) {
  const sessao = await requireTenant();
  const { preset, inicio, fim, frequencia, ordenar, busca, pagina } = await searchParams;

  const presetValido = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "mes";
  const frequenciaFiltro = FREQUENCIAS.some((f) => f.valor === frequencia)
    ? (frequencia as FrequenciaPagamento)
    : null;
  const ordenarPor = ordenar === "horas" ? "horas" : "valor";
  const buscaValor = busca ?? "";

  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  const { totalMinutos, totalValor, totalTurnos, porFuncao, porPessoaFuncao } =
    await agregarCustoPorFuncao(
      sessao.empresaEfetivoId,
      dataInicio,
      dataFim,
      frequenciaFiltro ?? undefined
    );

  const listaPorFuncao = porFuncao;
  const listaPorPessoaCompleta = [...porPessoaFuncao].sort((a, b) =>
    ordenarPor === "horas" ? b.minutos - a.minutos : b.valor - a.valor
  );

  const buscaNormalizada = normalizar(buscaValor);
  const listaPorPessoaFiltrada = buscaNormalizada
    ? listaPorPessoaCompleta.filter((p) => normalizar(p.pessoaNome).includes(buscaNormalizada))
    : listaPorPessoaCompleta;

  const totalPaginas = Math.max(1, Math.ceil(listaPorPessoaFiltrada.length / PESSOAS_POR_PAGINA));
  const paginaAtual = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  const listaPorPessoa = listaPorPessoaFiltrada.slice(
    (paginaAtual - 1) * PESSOAS_POR_PAGINA,
    paginaAtual * PESSOAS_POR_PAGINA
  );

  function formatarHoras(minutos: number): string {
    return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
  }

  function linkPeriodo(p: Preset): string {
    const params = new URLSearchParams();
    params.set("preset", p);
    if (ordenar) params.set("ordenar", ordenar);
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    return `/relatorios?${params.toString()}`;
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
    return `/relatorios?${params.toString()}`;
  }

  /** Monta um link de /relatorios preservando o período e os outros filtros
   * atuais, com overrides pontuais (ex.: trocar só a página ou a ordenação).
   * `undefined` num override remove aquele parâmetro do link. */
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
    return `/relatorios?${params.toString()}`;
  }

  /** Período atual (preset ou custom) como query string — reaproveitado
   * pelos três links de impressão, que precisam do mesmo intervalo que
   * já está na tela. */
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Relatórios</h1>
          <p className="text-stone-600 mt-1 text-sm">
            Quanto os extras estão custando pra empresa, por período e por
            função.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/relatorios/pdf?${periodoQuery()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            🖨️ Imprimir tudo
          </a>
          <Link
            href="/relatorios/horas"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            🕐 Horas dos funcionários (CLT)
          </Link>
          <Link
            href="/relatorios/resumo"
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            📊 Resumo semanal/mensal (extra + CLT)
          </Link>
        </div>
      </div>

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
          {frequenciaFiltro && <input type="hidden" name="frequencia" value={frequenciaFiltro} />}
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

      <div className="flex flex-wrap items-center gap-2">
        {FREQUENCIAS.map((f) => (
          <Link
            key={f.valor}
            href={linkFrequencia(f.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              (frequenciaFiltro ?? "TODAS") === f.valor
                ? "bg-navy-800 text-white border-navy-800"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card label="Custo total (PIX)" valor={`R$ ${totalValor.toFixed(2)}`} destaque />
        <Card label="Horas trabalhadas" valor={formatarHoras(totalMinutos)} />
        <Card label="Turnos no período" valor={String(totalTurnos)} />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-semibold text-navy-900">Custo por função</h2>
          <a
            href={`/relatorios/funcao/pdf?${periodoQuery()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-700 hover:underline"
          >
            🖨️ Imprimir por função
          </a>
        </div>
        {listaPorFuncao.length === 0 && (
          <p className="text-stone-500 text-sm">Nenhum turno pago nesse período.</p>
        )}
        <ul className="flex flex-col gap-2">
          {listaPorFuncao.map((f) => (
            <li
              key={f.funcaoId}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-navy-900">{f.nome}</p>
                <p className="text-xs text-stone-500">
                  {f.turnos} turno(s) · {formatarHoras(f.minutos)}
                </p>
              </div>
              <span className="text-sm font-semibold text-stone-700">R$ {f.valor.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-semibold text-navy-900">Por pessoa</h2>
          <div className="flex gap-2 text-xs">
            <Link
              href={linkPessoas({ ordenar: "valor", pagina: undefined })}
              className={`rounded-full border px-2 py-1 ${ordenarPor === "valor" ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600"}`}
            >
              Ordenar por valor
            </Link>
            <Link
              href={linkPessoas({ ordenar: "horas", pagina: undefined })}
              className={`rounded-full border px-2 py-1 ${ordenarPor === "horas" ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600"}`}
            >
              Ordenar por horas
            </Link>
          </div>
        </div>

        <form method="GET" className="flex flex-wrap items-center gap-2 mb-3">
          {periodoCustomizado ? (
            <>
              <input type="hidden" name="inicio" value={inicio} />
              <input type="hidden" name="fim" value={fim} />
            </>
          ) : (
            <input type="hidden" name="preset" value={presetValido} />
          )}
          <input type="hidden" name="ordenar" value={ordenarPor} />
          <input
            type="text"
            name="busca"
            defaultValue={buscaValor}
            placeholder="Buscar pessoa pelo nome..."
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full max-w-xs"
          />
          <button
            type="submit"
            className="rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 px-3 py-1.5 text-sm"
          >
            Buscar
          </button>
          {buscaValor && (
            <Link
              href={linkPessoas({ busca: undefined, pagina: undefined })}
              className="text-xs text-stone-500 hover:underline"
            >
              Limpar busca
            </Link>
          )}
        </form>

        {listaPorPessoaFiltrada.length === 0 && (
          <p className="text-stone-500 text-sm">
            {buscaValor
              ? `Nenhuma pessoa encontrada com "${buscaValor}" nesse período.`
              : "Nenhum turno pago nesse período."}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {listaPorPessoa.map((p, i) => (
            <li
              key={i}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <Link
                  href={`/freelancers/${p.pessoaId}`}
                  className="font-medium text-navy-900 hover:underline hover:text-brand-700"
                >
                  {p.pessoaNome}
                </Link>
                <p className="text-xs text-stone-500">
                  {p.funcaoNome} · {p.turnos} turno(s) · {formatarHoras(p.minutos)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-stone-700">R$ {p.valor.toFixed(2)}</span>
                <a
                  href={`/relatorios/pessoa/${p.pessoaId}/pdf?${periodoQuery()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Imprimir relatório de ${p.pessoaNome}`}
                  className="text-xs text-brand-700 hover:underline"
                >
                  🖨️
                </a>
              </div>
            </li>
          ))}
        </ul>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 text-sm">
            <Link
              href={linkPessoas({ pagina: String(Math.max(1, paginaAtual - 1)) })}
              className={`rounded-full border px-3 py-1.5 border-stone-300 text-stone-600 ${
                paginaAtual === 1 ? "pointer-events-none opacity-40" : "hover:bg-stone-50"
              }`}
            >
              ← Anterior
            </Link>
            <span className="text-stone-500">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <Link
              href={linkPessoas({ pagina: String(Math.min(totalPaginas, paginaAtual + 1)) })}
              className={`rounded-full border px-3 py-1.5 border-stone-300 text-stone-600 ${
                paginaAtual === totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-stone-50"
              }`}
            >
              Próxima →
            </Link>
          </div>
        )}
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
