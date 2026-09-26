import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import EmpresaMasterRow from "./EmpresaMasterRow";
import UsuarioMasterHeader from "./UsuarioMasterHeader";
import type { Prisma } from "@/generated/prisma/client";

const EMPRESA_SELECT = {
  id: true,
  nome: true,
  cnpj: true,
  endereco: true,
  statusAssinatura: true,
  assinaturaVenceEm: true,
  desativadaEm: true,
  motivoDesativacao: true,
  desativadaPorEmail: true,
  _count: {
    select: { funcoes: true, totens: true, turnos: true },
  },
} as const;

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

type Ordenar = "novos" | "alfabetica";
const ORDENAR_LABEL: Record<Ordenar, string> = { novos: "Mais novos", alfabetica: "Ordem alfabética" };

type Preset = "todos" | "hoje" | "semana" | "mes";
const PRESETS: { valor: Preset; label: string }[] = [
  { valor: "todos", label: "Todo período" },
  { valor: "hoje", label: "Hoje" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
];

/** Mesmo cálculo de período já usado em master/freelancers/page.tsx —
 * "hoje"/"semana"/"mês" sempre terminam agora (janela aberta), só o
 * início muda. */
function calcularPeriodo(preset: Exclude<Preset, "todos">, agora: Date): { inicio: Date; fim: Date } {
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim: agora };
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim: agora };
  return { inicio: inicioDoMesBrasil(agora), fim: agora };
}

/** Espelho do visual de src/app/master/assinaturas/page.tsx (já redesenhado
 * antes) — mesmo estilo de card v2 (rounded-2xl, ResumoCard em cima),
 * agora aplicado à tela principal do painel master, que até então ainda
 * era a única com o layout antigo (ver src/app/master/layout.tsx pra
 * casca/nav nova). Ordena por cadastro mais novo por padrão (pedido do
 * Thiago em 2026-09-26) — dá pra trocar pra ordem alfabética, buscar por
 * nome/e-mail e filtrar por período de cadastro (hoje/semana/mês/livre),
 * mesmo padrão de filtro já usado em master/freelancers/page.tsx. Só
 * filtra a lista de LOGINS (Usuario) — "sem dono vinculado" não tem
 * pessoa nenhuma pra buscar/ordenar por nome, fica de fora de propósito. */
export default async function MasterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ordenar?: string; preset?: string; inicio?: string; fim?: string }>;
}) {
  const sessao = await requireMaster();
  const idsMinhasEmpresas = new Set(sessao.minhasEmpresas.map((e) => e.id));

  const { q, ordenar, preset, inicio, fim } = await searchParams;
  const busca = (q ?? "").trim();
  const ordenarValido: Ordenar = ordenar === "alfabetica" ? "alfabetica" : "novos";
  const periodoCustomizado = Boolean(inicio && fim);
  const presetValido: Preset = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "todos";
  const temFiltroPeriodo = periodoCustomizado || presetValido !== "todos";

  const agora = new Date();
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido === "todos" ? "hoje" : presetValido, agora);

  const filtroPeriodo: Prisma.UsuarioWhereInput = temFiltroPeriodo
    ? { criadoEm: { gte: dataInicio, lte: dataFim } }
    : {};
  const filtroBusca: Prisma.UsuarioWhereInput = busca
    ? {
        OR: [
          { nomeCompleto: { contains: busca, mode: "insensitive" } },
          { email: { contains: busca, mode: "insensitive" } },
        ],
      }
    : {};

  // Monta a query string preservando os outros filtros ativos — cada pill
  // (ordenar/período) só troca o próprio parâmetro, sem derrubar busca nem
  // o outro filtro (mesmo espírito de linkPeriodo em master/assinaturas).
  function linkFiltro(troca: { ordenar?: Ordenar; preset?: Preset; limparPeriodo?: boolean }): string {
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    const ordenarFinal = troca.ordenar ?? ordenarValido;
    if (ordenarFinal !== "novos") params.set("ordenar", ordenarFinal);
    if (!troca.limparPeriodo) {
      if (periodoCustomizado) {
        params.set("inicio", inicio!);
        params.set("fim", fim!);
      } else {
        const presetFinal = troca.preset ?? presetValido;
        if (presetFinal !== "todos") params.set("preset", presetFinal);
      }
    }
    const query = params.toString();
    return query ? `/master?${query}` : "/master";
  }

  const [pessoasBrutas, empresasSemDono] = await Promise.all([
    prisma.usuario.findMany({
      where: { isMaster: false, ...filtroPeriodo, ...filtroBusca },
      // Ordem alfabética de verdade (sem diferenciar maiúscula/minúscula)
      // não dá pra pedir direto no orderBy do Prisma pro Postgres — o
      // `mode: "insensitive"` só existe pro filtro `where`. Busca já vem
      // ordenada por criadoEm aqui; quando o pedido é alfabética, reordena
      // em memória logo abaixo (lista de logins nunca é grande o
      // suficiente pra isso pesar).
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        criadoEm: true,
        empresas: { select: { criadoEm: true, empresa: { select: EMPRESA_SELECT } } },
      },
    }),
    prisma.empresa.findMany({
      where: { usuarios: { none: {} } },
      select: EMPRESA_SELECT,
    }),
  ]);

  const pessoas =
    ordenarValido === "alfabetica"
      ? [...pessoasBrutas].sort((a, b) =>
          (a.nomeCompleto ?? a.email).localeCompare(b.nomeCompleto ?? b.email, "pt-BR", { sensitivity: "base" })
        )
      : pessoasBrutas;

  const totalEmpresas =
    pessoas.reduce((soma, p) => soma + p.empresas.length, 0) + empresasSemDono.length;

  const formatarData = (data: Date) =>
    data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Empresas</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Todas as pessoas cadastradas e as empresas de cada uma. Seu login tem acesso total
          (cadastrar, editar e apagar) a qualquer uma delas.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <ResumoCard label="Logins cadastrados" valor={pessoas.length} destaque />
        <ResumoCard label="Empresas no total" valor={totalEmpresas} />
        <ResumoCard label="Sem dono vinculado" valor={empresasSemDono.length} />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500 mr-1">Ordenar:</span>
          {(Object.keys(ORDENAR_LABEL) as Ordenar[]).map((valor) => (
            <Link
              key={valor}
              href={linkFiltro({ ordenar: valor })}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                ordenarValido === valor
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {ORDENAR_LABEL[valor]}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500 mr-1">Cadastrados em:</span>
          {PRESETS.map((p) => (
            <Link
              key={p.valor}
              href={linkFiltro({ preset: p.valor, limparPeriodo: p.valor === "todos" })}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                !periodoCustomizado && presetValido === p.valor
                  ? "bg-navy-800 text-white border-navy-800"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {p.label}
            </Link>
          ))}
          <form method="GET" className="flex flex-wrap items-center gap-2">
            {ordenarValido !== "novos" && <input type="hidden" name="ordenar" value={ordenarValido} />}
            {busca && <input type="hidden" name="q" value={busca} />}
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

        <form method="GET" className="flex items-center gap-2">
          {ordenarValido !== "novos" && <input type="hidden" name="ordenar" value={ordenarValido} />}
          {periodoCustomizado ? (
            <>
              <input type="hidden" name="inicio" value={inicio} />
              <input type="hidden" name="fim" value={fim} />
            </>
          ) : (
            presetValido !== "todos" && <input type="hidden" name="preset" value={presetValido} />
          )}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome ou e-mail..."
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
          />
          <button
            type="submit"
            className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 hover:bg-stone-50"
          >
            Buscar
          </button>
        </form>
      </div>

      {pessoas.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum login encontrado com esse filtro.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {pessoas.map((pessoa) => (
            <li key={pessoa.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <UsuarioMasterHeader
                usuarioId={pessoa.id}
                nomeCompleto={pessoa.nomeCompleto}
                email={pessoa.email}
                cadastradoEm={formatarData(pessoa.criadoEm)}
              />
              {pessoa.empresas.length > 0 ? (
                <ul className="flex flex-col gap-2 mt-3">
                  {pessoa.empresas.map(({ empresa, criadoEm }) => (
                    <EmpresaMasterRow
                      key={empresa.id}
                      empresa={{
                        id: empresa.id,
                        nome: empresa.nome,
                        cnpj: empresa.cnpj,
                        endereco: empresa.endereco,
                        statusAssinatura: empresa.statusAssinatura,
                        assinaturaVenceEm: empresa.assinaturaVenceEm,
                        desativadaEm: empresa.desativadaEm,
                        motivoDesativacao: empresa.motivoDesativacao,
                        desativadaPorEmail: empresa.desativadaPorEmail,
                        counts: empresa._count,
                      }}
                      vinculadoEm={formatarData(criadoEm)}
                      jaMinha={idsMinhasEmpresas.has(empresa.id)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-stone-400 mt-3">Nenhuma empresa vinculada.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {empresasSemDono.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 mb-2">Sem dono vinculado</h2>
          <ul className="flex flex-col gap-2">
            {empresasSemDono.map((empresa) => (
              <EmpresaMasterRow
                key={empresa.id}
                empresa={{
                  id: empresa.id,
                  nome: empresa.nome,
                  cnpj: empresa.cnpj,
                  endereco: empresa.endereco,
                  statusAssinatura: empresa.statusAssinatura,
                  assinaturaVenceEm: empresa.assinaturaVenceEm,
                  desativadaEm: empresa.desativadaEm,
                  motivoDesativacao: empresa.motivoDesativacao,
                  desativadaPorEmail: empresa.desativadaPorEmail,
                  counts: empresa._count,
                }}
                vinculadoEm={null}
                jaMinha={idsMinhasEmpresas.has(empresa.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
