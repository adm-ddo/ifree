import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baixarComoDataUrl } from "@/lib/blob";
import {
  formatarDataHora,
  inicioDoDiaBrasil,
  inicioDaSemanaBrasil,
  inicioDoMesBrasil,
} from "@/lib/data";
import PessoaMasterRow from "./PessoaMasterRow";
import type { Prisma } from "@/generated/prisma/client";

type Preset = "todos" | "hoje" | "semana" | "mes";
const PRESETS: { valor: Preset; label: string }[] = [
  { valor: "todos", label: "Todos os períodos" },
  { valor: "hoje", label: "Hoje" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
];

/// Sem paginação, essa tela buscava e baixava a foto de perfil de TODO
/// freelancer cadastrado de uma vez (fotosDataUrl abaixo) — com a base
/// crescendo (meta: milhares de freelancers), ia ficar cada vez mais
/// pesada até travar de vez, igual o loop de e-mail que já corrigimos em
/// src/lib/match-passivo.ts. 30 por página é confortável de rolar sem
/// esconder demais quem se está procurando.
const PAGINA_TAMANHO = 30;

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim: agora };
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim: agora };
  return { inicio: inicioDoMesBrasil(agora), fim: agora };
}

export default async function MasterFreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{
    portal?: string;
    conta?: string;
    nome?: string;
    preset?: string;
    inicio?: string;
    fim?: string;
    pagina?: string;
  }>;
}) {
  await requireMaster();
  const { portal, conta, nome, preset, inicio, fim, pagina } = await searchParams;
  const soPortalAtivo = portal === "1";
  const soDesativadas = conta === "desativadas";
  const soExcluidas = conta === "excluidas";
  const nomeFiltro = nome?.trim() || "";
  const paginaAtual = Math.max(1, Number(pagina) || 1);

  // Mesmo padrão de filtro de período já usado em /pagamentos — "todos os
  // períodos" (padrão) não restringe nada, cada preset filtra pelo
  // cadastro (criadoEm) da Pessoa.
  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const presetValido: Preset = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "todos";
  const temFiltroPeriodo = periodoCustomizado || presetValido !== "todos";
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido === "todos" ? "hoje" : presetValido, agora);

  const filtroPeriodo: Prisma.PessoaWhereInput = temFiltroPeriodo
    ? { criadoEm: { gte: dataInicio, lte: dataFim } }
    : {};

  const filtroNome: Prisma.PessoaWhereInput = nomeFiltro
    ? { nome: { contains: nomeFiltro, mode: "insensitive" } }
    : {};
  const filtroCompleto: Prisma.PessoaWhereInput = {
    ...(soPortalAtivo ? { senhaHash: { not: null } } : {}),
    ...(soDesativadas ? { contaDesativadaEm: { not: null } } : {}),
    ...(soExcluidas ? { contaExcluidaEm: { not: null } } : {}),
    ...filtroNome,
    ...filtroPeriodo,
  };

  const [pessoas, totalFiltrado] = await Promise.all([
    prisma.pessoa.findMany({
      where: filtroCompleto,
      // Recém-cadastradas primeiro — é o que mais ajuda a acompanhar quem
      // vai se cadastrando no iFREE Conecta, diferente de uma ordem
      // alfabética fixa que não muda com o tempo.
      orderBy: { criadoEm: "desc" },
      skip: (paginaAtual - 1) * PAGINA_TAMANHO,
      take: PAGINA_TAMANHO,
      select: {
        id: true,
        nome: true,
        documento: true,
        tipoDocumento: true,
        telefone: true,
        criadoEm: true,
        senhaHash: true,
        disponivelParaOportunidades: true,
        contaDesativadaEm: true,
        contaExcluidaEm: true,
        fotoPerfilUrl: true,
        _count: { select: { turnos: true, vinculos: true } },
      },
    }),
    prisma.pessoa.count({ where: filtroCompleto }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGINA_TAMANHO));

  const totalComPortal = soPortalAtivo
    ? pessoas.length
    : await prisma.pessoa.count({ where: { senhaHash: { not: null }, ...filtroNome, ...filtroPeriodo } });
  const totalDesativadas = soDesativadas
    ? pessoas.length
    : await prisma.pessoa.count({ where: { contaDesativadaEm: { not: null }, ...filtroNome, ...filtroPeriodo } });
  const totalExcluidas = soExcluidas
    ? pessoas.length
    : await prisma.pessoa.count({ where: { contaExcluidaEm: { not: null }, ...filtroNome, ...filtroPeriodo } });

  // Mesma prioridade de sempre: fotoPerfilUrl (cadastro do Portal/iFREE
  // Conecta) é a foto "de verdade" — fotoUrl (totem) nunca entra aqui de
  // propósito. baixarComoDataUrl em vez do proxy /pessoas/[id]/foto (que
  // AvatarPessoa usa) porque aquela rota exige requireTenant() — sessão de
  // empresa, que o master não tem; mesmo padrão já usado no perfil
  // individual (master/freelancers/[id]/page.tsx).
  const fotosDataUrl = await Promise.all(
    pessoas.map((p) => (p.fotoPerfilUrl ? baixarComoDataUrl(p.fotoPerfilUrl) : Promise.resolve(null)))
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Freelancers</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Todo cadastro global de freelancer (CPF/CNPJ), de todas as
          empresas, mais recém-cadastrados primeiro. Clique no nome pra ver
          o perfil completo (foto, bio, habilidades, reputação). Só é
          possível excluir quem não tem nenhum turno registrado — é
          histórico de trabalho/pagamento.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { valor: null as "portal" | "desativadas" | "excluidas" | null, label: "Todos", total: null },
          { valor: "portal" as const, label: `🔗 Com Portal ativo (Conecta) (${totalComPortal})`, total: totalComPortal },
          { valor: "desativadas" as const, label: `⏸️ Desativadas (${totalDesativadas})`, total: totalDesativadas },
          { valor: "excluidas" as const, label: `🗑️ Excluídas (${totalExcluidas})`, total: totalExcluidas },
        ].map((f) => {
          const ativo = f.valor === null ? !soPortalAtivo && !soDesativadas && !soExcluidas : f.valor === "portal" ? soPortalAtivo : f.valor === "desativadas" ? soDesativadas : soExcluidas;
          return (
            <Link
              key={f.label}
              href={{
                pathname: "/master/freelancers",
                query: {
                  ...(f.valor === "portal" ? { portal: "1" } : {}),
                  ...(f.valor === "desativadas" || f.valor === "excluidas" ? { conta: f.valor } : {}),
                  ...(nomeFiltro ? { nome: nomeFiltro } : {}),
                  ...(periodoCustomizado ? { inicio, fim } : presetValido !== "todos" ? { preset: presetValido } : {}),
                },
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                ativo ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const params = new URLSearchParams();
          if (soPortalAtivo) params.set("portal", "1");
          if (soDesativadas) params.set("conta", "desativadas");
          if (soExcluidas) params.set("conta", "excluidas");
          if (nomeFiltro) params.set("nome", nomeFiltro);
          if (p.valor !== "todos") params.set("preset", p.valor);
          const query = params.toString();
          return (
            <Link
              key={p.valor}
              href={query ? `/master/freelancers?${query}` : "/master/freelancers"}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                !periodoCustomizado && presetValido === p.valor
                  ? "bg-navy-800 text-white border-navy-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-2">
        {soPortalAtivo && <input type="hidden" name="portal" value="1" />}
        {(soDesativadas || soExcluidas) && (
          <input type="hidden" name="conta" value={soDesativadas ? "desativadas" : "excluidas"} />
        )}
        {presetValido !== "todos" && !periodoCustomizado && (
          <input type="hidden" name="preset" value={presetValido} />
        )}
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Nome
          <input
            type="text"
            name="nome"
            defaultValue={nomeFiltro}
            placeholder="Buscar por nome..."
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          De
          <input
            type="date"
            name="inicio"
            defaultValue={inicio ?? ""}
            className="border border-stone-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Até
          <input
            type="date"
            name="fim"
            defaultValue={fim ?? ""}
            className="border border-stone-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Filtrar
        </button>
        {(nomeFiltro || periodoCustomizado) && (
          <Link
            href={{
              pathname: "/master/freelancers",
              query: {
                ...(soPortalAtivo ? { portal: "1" } : {}),
                ...(soDesativadas || soExcluidas ? { conta: soDesativadas ? "desativadas" : "excluidas" } : {}),
              },
            }}
            className="text-sm text-stone-500 hover:underline px-2 py-2"
          >
            Limpar
          </Link>
        )}
      </form>

      {pessoas.length === 0 && (
        <p className="text-stone-500 text-sm">
          {nomeFiltro
            ? `Nenhum freelancer encontrado com "${nomeFiltro}" nesse filtro.`
            : soDesativadas
              ? "Ninguém com a conta desativada."
              : soExcluidas
                ? "Ninguém com a conta excluída."
                : soPortalAtivo && temFiltroPeriodo
                  ? "Ninguém ativou o Portal nesse período."
                  : soPortalAtivo
                    ? "Ninguém ativou o Portal ainda."
                    : temFiltroPeriodo
                      ? "Nenhum freelancer cadastrado nesse período."
                      : "Nenhum freelancer cadastrado ainda."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {pessoas.map((p, i) => (
          <PessoaMasterRow
            key={p.id}
            pessoa={{
              id: p.id,
              nome: p.nome,
              documento: p.documento,
              tipoDocumento: p.tipoDocumento,
              telefone: p.telefone,
              criadoEmLabel: formatarDataHora(p.criadoEm),
              temPortalAtivo: p.senhaHash !== null,
              disponivelParaOportunidades: p.disponivelParaOportunidades,
              contaDesativadaEm: p.contaDesativadaEm,
              contaExcluidaEm: p.contaExcluidaEm,
              totalTurnos: p._count.turnos,
              totalEmpresas: p._count.vinculos,
              fotoDataUrl: fotosDataUrl[i],
            }}
          />
        ))}
      </ul>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-stone-500">
            Página {paginaAtual} de {totalPaginas} ({totalFiltrado} no total)
          </span>
          <div className="flex gap-2">
            <Link
              href={{
                pathname: "/master/freelancers",
                query: {
                  ...(soPortalAtivo ? { portal: "1" } : {}),
                  ...(soDesativadas || soExcluidas ? { conta: soDesativadas ? "desativadas" : "excluidas" } : {}),
                  ...(nomeFiltro ? { nome: nomeFiltro } : {}),
                  ...(periodoCustomizado ? { inicio, fim } : presetValido !== "todos" ? { preset: presetValido } : {}),
                  ...(paginaAtual > 2 ? { pagina: String(paginaAtual - 1) } : {}),
                },
              }}
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
              href={{
                pathname: "/master/freelancers",
                query: {
                  ...(soPortalAtivo ? { portal: "1" } : {}),
                  ...(soDesativadas || soExcluidas ? { conta: soDesativadas ? "desativadas" : "excluidas" } : {}),
                  ...(nomeFiltro ? { nome: nomeFiltro } : {}),
                  ...(periodoCustomizado ? { inicio, fim } : presetValido !== "todos" ? { preset: presetValido } : {}),
                  pagina: String(paginaAtual + 1),
                },
              }}
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
