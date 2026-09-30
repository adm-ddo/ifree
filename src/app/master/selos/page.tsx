import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VALOR_SELO_PRATA, VALOR_SELO_OURO } from "@/lib/selo-freelancer";
import { formatarDocumento, LABEL_TIPO_DOCUMENTO } from "@/lib/documento";
import { inicioDoMesBrasil } from "@/lib/data";
import type { SeloFreelancer, StatusCobranca } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const SELO_FILTRO_LABEL: Record<SeloFreelancer, string> = {
  BRONZE: "Bronze",
  PRATA: "Prata",
  OURO: "Ouro",
};

const SELO_CLASSE: Record<SeloFreelancer, string> = {
  BRONZE: "bg-stone-100 text-stone-600 border-stone-200",
  PRATA: "bg-slate-100 text-slate-700 border-slate-300",
  OURO: "bg-amber-50 text-amber-700 border-amber-300",
};

const SELO_CLASSE_ATIVO: Record<SeloFreelancer, string> = {
  BRONZE: "bg-stone-600 text-white border-stone-600",
  PRATA: "bg-slate-600 text-white border-slate-600",
  OURO: "bg-amber-600 text-white border-amber-600",
};

const STATUS_COBRANCA_LABEL: Record<StatusCobranca, string> = {
  PENDENTE: "Aguardando Pix",
  PAGA: "Paga",
  EXPIRADA: "Expirada",
  CANCELADA: "Cancelada",
};

const STATUS_COBRANCA_CLASSE: Record<StatusCobranca, string> = {
  PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
  PAGA: "bg-brand-50 text-brand-700 border-brand-200",
  EXPIRADA: "bg-stone-100 text-stone-500 border-stone-200",
  CANCELADA: "bg-red-50 text-red-700 border-red-200",
};

type PeriodoPreset = "mes" | "mesAnterior";
const PERIODO_PRESETS: { valor: PeriodoPreset; label: string }[] = [
  { valor: "mes", label: "Este mês" },
  { valor: "mesAnterior", label: "Mês anterior" },
];

/** Mesmo truque de "um instante antes do início do mês atual cai no mês
 * passado" usado em src/app/master/assinaturas/page.tsx. */
function calcularPeriodo(preset: PeriodoPreset, agora: Date): { inicio: Date; fim: Date } {
  const inicioMesAtual = inicioDoMesBrasil(agora);
  if (preset === "mesAnterior") {
    const inicioMesAnterior = inicioDoMesBrasil(new Date(inicioMesAtual.getTime() - 1));
    return { inicio: inicioMesAnterior, fim: inicioMesAtual };
  }
  return { inicio: inicioMesAtual, fim: agora };
}

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const PAGINA_TAMANHO = 30;

/** Espelho de src/app/master/assinaturas/page.tsx, só que pro selo do
 * freelancer (Bronze/Prata/Ouro, ver src/lib/selo-freelancer.ts) em vez da
 * mensalidade da empresa — pedido do Thiago em 2026-09-30 depois de
 * perguntar onde tinha ficado essa visão. Mais simples que a de empresa:
 * preço do selo é fixo (sem valor negociado por pessoa), então não tem
 * card com modal de edição, só acompanhamento.
 *
 * Por padrão só mostra quem já interagiu com o selo (selo pago atual OU já
 * gerou alguma cobrança alguma vez) — a base de freelancers cadastrados
 * pode ser muito maior que a de empresas (ver PAGINA_TAMANHO em
 * master/freelancers/page.tsx), então listar todo mundo por padrão
 * afundaria a tela em gente que nunca nem olhou pra tela de selo. Buscar
 * por nome/documento busca em TODOS, incluindo quem nunca interagiu. */
export default async function MasterSelosPage({
  searchParams,
}: {
  searchParams: Promise<{
    selo?: string;
    todos?: string;
    periodo?: string;
    inicio?: string;
    fim?: string;
    q?: string;
    pagina?: string;
  }>;
}) {
  await requireMaster();
  const { selo, todos, periodo, inicio, fim, q, pagina } = await searchParams;
  const busca = (q ?? "").trim();
  const seloFiltro = (Object.keys(SELO_FILTRO_LABEL) as SeloFreelancer[]).includes(selo as SeloFreelancer)
    ? (selo as SeloFreelancer)
    : null;
  const mostrarTodos = todos === "1" || Boolean(busca);
  const paginaAtual = Math.max(1, Number(pagina) || 1);

  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const presetValido: PeriodoPreset = periodo === "mesAnterior" ? "mesAnterior" : "mes";
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  function linkFiltro(troca: {
    selo?: SeloFreelancer | null;
    todos?: boolean;
    periodo?: PeriodoPreset;
    pagina?: number;
  }): string {
    const params = new URLSearchParams();
    const seloFinal = troca.selo !== undefined ? troca.selo : seloFiltro;
    if (seloFinal) params.set("selo", seloFinal);
    if (busca) params.set("q", busca);
    const todosFinal = troca.todos ?? mostrarTodos;
    if (todosFinal && !busca) params.set("todos", "1");
    if (periodoCustomizado) {
      params.set("inicio", inicio!);
      params.set("fim", fim!);
    } else {
      const presetFinal = troca.periodo ?? presetValido;
      if (presetFinal !== "mes") params.set("periodo", presetFinal);
    }
    if (troca.pagina && troca.pagina > 1) params.set("pagina", String(troca.pagina));
    const query = params.toString();
    return query ? `/master/selos?${query}` : "/master/selos";
  }

  // Contagens globais (pra resumo/MRR) — independentes de qualquer filtro
  // de busca/período da lista abaixo.
  const [totalBronze, totalPrata, totalOuro] = await Promise.all([
    prisma.pessoa.count({ where: { selo: "BRONZE" } }),
    prisma.pessoa.count({ where: { selo: "PRATA" } }),
    prisma.pessoa.count({ where: { selo: "OURO" } }),
  ]);
  const mrr = totalPrata * VALOR_SELO_PRATA + totalOuro * VALOR_SELO_OURO;

  // Financeiro do período (todas as cobranças de selo, sem filtro de
  // pessoa) — mesma distinção emissão (criadoEm) x recebimento (pagoEm) de
  // master/assinaturas.
  const cobrancasNoPeriodo = await prisma.cobrancaSelo.findMany({
    where: { criadoEm: { gte: dataInicio, lte: dataFim } },
    select: { status: true, valor: true, pagoEm: true },
  });
  const cobrancasPagasNoPeriodo = await prisma.cobrancaSelo.findMany({
    where: { status: "PAGA", pagoEm: { gte: dataInicio, lte: dataFim } },
    select: { valor: true },
  });
  const financeiro = {
    totalGerado: cobrancasNoPeriodo.reduce((soma, c) => soma + Number(c.valor), 0),
    totalRecebido: cobrancasPagasNoPeriodo.reduce((soma, c) => soma + Number(c.valor), 0),
    qtdPendente: cobrancasNoPeriodo.filter((c) => c.status === "PENDENTE").length,
    qtdExpirada: cobrancasNoPeriodo.filter((c) => c.status === "EXPIRADA").length,
  };

  const filtroSelo: Prisma.PessoaWhereInput = seloFiltro ? { selo: seloFiltro } : {};
  const buscaDigitos = busca.replace(/\D/g, "");
  const filtroBusca: Prisma.PessoaWhereInput = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          ...(buscaDigitos.length > 0 ? [{ documento: { contains: buscaDigitos } }] : []),
        ],
      }
    : {};
  const filtroEngajamento: Prisma.PessoaWhereInput = mostrarTodos
    ? {}
    : { OR: [{ selo: { not: "BRONZE" } }, { cobrancasSelo: { some: {} } }] };

  const filtroCompleto: Prisma.PessoaWhereInput = {
    ...filtroSelo,
    ...filtroBusca,
    ...filtroEngajamento,
  };

  const [pessoas, totalFiltrado] = await Promise.all([
    prisma.pessoa.findMany({
      where: filtroCompleto,
      orderBy: [{ selo: "desc" }, { nome: "asc" }],
      skip: (paginaAtual - 1) * PAGINA_TAMANHO,
      take: PAGINA_TAMANHO,
      select: {
        id: true,
        nome: true,
        documento: true,
        tipoDocumento: true,
        selo: true,
        seloVenceEm: true,
        cobrancasSelo: {
          orderBy: { criadoEm: "desc" },
          take: 1,
          select: { status: true, valor: true, selo: true, pagoEm: true, criadoEm: true },
        },
      },
    }),
    prisma.pessoa.count({ where: filtroCompleto }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGINA_TAMANHO));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Selos dos freelancers</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Monetização em cima do freelancer (iFREE Conecta) — Bronze é grátis/manual, Prata (R${" "}
          {VALOR_SELO_PRATA.toFixed(2)}/mês) e Ouro (R$ {VALOR_SELO_OURO.toFixed(2)}/mês) liberam
          currículo em PDF e alerta por e-mail de vaga compatível.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResumoCard label="Bronze" valor={totalBronze} />
        <ResumoCard label="Prata" valor={totalPrata} />
        <ResumoCard label="Ouro" valor={totalOuro} />
        <ResumoCard label="MRR do selo" valor={`R$ ${mrr.toFixed(2)}`} destaque />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-navy-900 mr-1">No período:</span>
          {PERIODO_PRESETS.map((p) => (
            <Link
              key={p.valor}
              href={linkFiltro({ periodo: p.valor })}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                !periodoCustomizado && presetValido === p.valor
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
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

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={linkFiltro({ selo: null })}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              !seloFiltro ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            Todos os selos
          </Link>
          {(Object.entries(SELO_FILTRO_LABEL) as [SeloFreelancer, string][]).map(([valor, label]) => (
            <Link
              key={valor}
              href={linkFiltro({ selo: valor })}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                seloFiltro === valor ? SELO_CLASSE_ATIVO[valor] : `${SELO_CLASSE[valor]} hover:opacity-80`
              }`}
            >
              {label}
            </Link>
          ))}
          {!busca && (
            <Link
              href={linkFiltro({ todos: !mostrarTodos })}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                mostrarTodos
                  ? "bg-navy-800 text-white border-navy-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {mostrarTodos ? "✓ Mostrando todos" : "Mostrar todos (incl. quem nunca assinou)"}
            </Link>
          )}
        </div>

        <form method="GET" className="flex items-center gap-2">
          {seloFiltro && <input type="hidden" name="selo" value={seloFiltro} />}
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
            placeholder="Buscar por nome ou documento..."
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
          />
        </form>
      </div>

      {pessoas.length === 0 ? (
        <p className="text-stone-500 text-sm">
          {busca ? `Nenhum freelancer encontrado com "${busca}".` : "Ninguém com esse filtro ainda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pessoas.map((p) => {
            const ultima = p.cobrancasSelo[0] ?? null;
            return (
              <li
                key={p.id}
                className="rounded-xl border border-stone-200 bg-white p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link href={`/master/freelancers/${p.id}`} className="font-medium text-navy-900 hover:underline">
                    {p.nome}
                  </Link>
                  <p className="text-sm text-stone-500">
                    {formatarDocumento(p.tipoDocumento, p.documento)} · {LABEL_TIPO_DOCUMENTO[p.tipoDocumento]}
                  </p>
                  {p.seloVenceEm && p.selo !== "BRONZE" && (
                    <p className="text-xs text-stone-400 mt-0.5">Vence em {formatarData(p.seloVenceEm)}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {ultima && (
                    <span
                      className={`text-xs rounded-full border px-2 py-1 ${STATUS_COBRANCA_CLASSE[ultima.status]}`}
                      title={`Última cobrança: R$ ${Number(ultima.valor).toFixed(2)} (selo ${ultima.selo}) em ${formatarData(ultima.criadoEm)}`}
                    >
                      {STATUS_COBRANCA_LABEL[ultima.status]} · R$ {Number(ultima.valor).toFixed(2)}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium uppercase tracking-wide rounded-full border px-2 py-1 ${SELO_CLASSE[p.selo]}`}
                  >
                    {SELO_FILTRO_LABEL[p.selo]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-stone-500">
            Página {paginaAtual} de {totalPaginas} ({totalFiltrado} no total)
          </span>
          <div className="flex gap-2">
            <Link
              href={linkFiltro({ pagina: paginaAtual - 1 })}
              aria-disabled={paginaAtual <= 1}
              className={`rounded-lg border px-3 py-1.5 transition-colors ${
                paginaAtual <= 1
                  ? "pointer-events-none border-stone-200 text-stone-300"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              ← Anterior
            </Link>
            <Link
              href={linkFiltro({ pagina: paginaAtual + 1 })}
              aria-disabled={paginaAtual >= totalPaginas}
              className={`rounded-lg border px-3 py-1.5 transition-colors ${
                paginaAtual >= totalPaginas
                  ? "pointer-events-none border-stone-200 text-stone-300"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              Próxima →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumoCard({ label, valor, destaque }: { label: string; valor: number | string; destaque?: boolean }) {
  if (destaque) {
    return (
      <div className="rounded-2xl bg-navy-900 text-white p-4 shadow-sm">
        <p className="text-2xl font-semibold">{valor}</p>
        <p className="text-xs opacity-75 mt-1">{label}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-navy-900">{valor}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}
