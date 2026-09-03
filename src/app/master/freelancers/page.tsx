import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim: agora };
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim: agora };
  return { inicio: inicioDoMesBrasil(agora), fim: agora };
}

export default async function MasterFreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string; preset?: string; inicio?: string; fim?: string }>;
}) {
  await requireMaster();
  const { portal, preset, inicio, fim } = await searchParams;
  const soPortalAtivo = portal === "1";

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

  const pessoas = await prisma.pessoa.findMany({
    where: {
      ...(soPortalAtivo ? { senhaHash: { not: null } } : {}),
      ...filtroPeriodo,
    },
    // Recém-cadastradas primeiro — é o que mais ajuda a acompanhar quem vai
    // se cadastrando no iFREE Conecta, diferente de uma ordem alfabética
    // fixa que não muda com o tempo.
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      nome: true,
      documento: true,
      tipoDocumento: true,
      telefone: true,
      criadoEm: true,
      senhaHash: true,
      disponivelParaOportunidades: true,
      _count: { select: { turnos: true, vinculos: true } },
    },
  });

  const totalComPortal = soPortalAtivo
    ? pessoas.length
    : await prisma.pessoa.count({ where: { senhaHash: { not: null }, ...filtroPeriodo } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/master" className="text-sm text-brand-700 hover:underline">
          ← Painel Master
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Freelancers</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Todo cadastro global de freelancer (CPF/CNPJ), de todas as
          empresas, mais recém-cadastrados primeiro. Clique no nome pra ver
          o perfil completo (foto, bio, habilidades, reputação). Só é
          possível excluir quem não tem nenhum turno registrado — é
          histórico de trabalho/pagamento.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={{
            pathname: "/master/freelancers",
            query: periodoCustomizado ? { inicio, fim } : presetValido !== "todos" ? { preset: presetValido } : {},
          }}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            !soPortalAtivo
              ? "bg-stone-800 text-white border-stone-800"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Todos
        </Link>
        <Link
          href={{
            pathname: "/master/freelancers",
            query: {
              portal: "1",
              ...(periodoCustomizado ? { inicio, fim } : presetValido !== "todos" ? { preset: presetValido } : {}),
            },
          }}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            soPortalAtivo
              ? "bg-brand-700 text-white border-brand-700"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          🔗 Com Portal ativo (Conecta) ({totalComPortal})
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const params = new URLSearchParams();
          if (soPortalAtivo) params.set("portal", "1");
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
        <form method="GET" className="flex flex-wrap items-center gap-2">
          {soPortalAtivo && <input type="hidden" name="portal" value="1" />}
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
                ? "bg-navy-800 text-white border-navy-800"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            Período
          </button>
        </form>
      </div>

      {pessoas.length === 0 && (
        <p className="text-stone-500 text-sm">
          {soPortalAtivo && temFiltroPeriodo
            ? "Ninguém ativou o Portal nesse período."
            : soPortalAtivo
              ? "Ninguém ativou o Portal ainda."
              : temFiltroPeriodo
                ? "Nenhum freelancer cadastrado nesse período."
                : "Nenhum freelancer cadastrado ainda."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {pessoas.map((p) => (
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
              totalTurnos: p._count.turnos,
              totalEmpresas: p._count.vinculos,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
