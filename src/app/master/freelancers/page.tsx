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

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim: agora };
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim: agora };
  return { inicio: inicioDoMesBrasil(agora), fim: agora };
}

export default async function MasterFreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string; conta?: string; preset?: string; inicio?: string; fim?: string }>;
}) {
  await requireMaster();
  const { portal, conta, preset, inicio, fim } = await searchParams;
  const soPortalAtivo = portal === "1";
  const soDesativadas = conta === "desativadas";
  const soExcluidas = conta === "excluidas";

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
      ...(soDesativadas ? { contaDesativadaEm: { not: null } } : {}),
      ...(soExcluidas ? { contaExcluidaEm: { not: null } } : {}),
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
      contaDesativadaEm: true,
      contaExcluidaEm: true,
      fotoPerfilUrl: true,
      _count: { select: { turnos: true, vinculos: true } },
    },
  });

  const totalComPortal = soPortalAtivo
    ? pessoas.length
    : await prisma.pessoa.count({ where: { senhaHash: { not: null }, ...filtroPeriodo } });
  const totalDesativadas = soDesativadas
    ? pessoas.length
    : await prisma.pessoa.count({ where: { contaDesativadaEm: { not: null }, ...filtroPeriodo } });
  const totalExcluidas = soExcluidas
    ? pessoas.length
    : await prisma.pessoa.count({ where: { contaExcluidaEm: { not: null }, ...filtroPeriodo } });

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
          {(soDesativadas || soExcluidas) && (
            <input type="hidden" name="conta" value={soDesativadas ? "desativadas" : "excluidas"} />
          )}
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
          {soDesativadas
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
    </div>
  );
}
