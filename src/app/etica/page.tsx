import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireResponsavelEtica, slaVencido, CATEGORIAS_DENUNCIA, LABEL_CATEGORIA_DENUNCIA, LABEL_STATUS_DENUNCIA, STATUS_DENUNCIA_ORDEM } from "@/lib/etica";
import { gerarLinkPublicoDenuncia } from "./actions";
import { formatarDataHora } from "@/lib/data";
import LinkPublicoBox from "./LinkPublicoBox";
import type { CategoriaDenuncia, GravidadeDenuncia, StatusDenuncia } from "@/generated/prisma/enums";

const COR_STATUS: Record<StatusDenuncia, string> = {
  RECEBIDO: "bg-stone-100 text-stone-600 border-stone-200",
  TRIAGEM: "bg-amber-50 text-amber-700 border-amber-200",
  EM_INVESTIGACAO: "bg-amber-50 text-amber-700 border-amber-200",
  AGUARDANDO_INFORMACOES: "bg-amber-50 text-amber-700 border-amber-200",
  PARECER_EMITIDO: "bg-brand-50 text-brand-700 border-brand-200",
  PROVIDENCIAS: "bg-brand-50 text-brand-700 border-brand-200",
  FINALIZADO: "bg-stone-100 text-stone-500 border-stone-200",
};

const COR_GRAVIDADE: Record<GravidadeDenuncia, string> = {
  BAIXA: "bg-stone-100 text-stone-600 border-stone-200",
  MEDIA: "bg-amber-50 text-amber-700 border-amber-200",
  ALTA: "bg-red-50 text-red-700 border-red-200",
};

export default async function EticaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; categoria?: string; gravidade?: string }>;
}) {
  const sessao = await requireResponsavelEtica();
  const { status, categoria, gravidade } = await searchParams;

  const [token, hdrs] = await Promise.all([gerarLinkPublicoDenuncia(), headers()]);
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const linkPublico = `${proto}://${host}/denuncia/${token}`;

  const empresaId = sessao.empresaEfetivoId;

  const [total, abertas, finalizadas, emAberto] = await Promise.all([
    prisma.denuncia.count({ where: { empresaId } }),
    prisma.denuncia.count({ where: { empresaId, status: { not: "FINALIZADO" } } }),
    prisma.denuncia.count({ where: { empresaId, status: "FINALIZADO" } }),
    prisma.denuncia.findMany({
      where: { empresaId, status: { not: "FINALIZADO" } },
      select: { status: true, prazoSlaEm: true },
    }),
  ]);
  const slaVencidas = emAberto.filter((d) => slaVencido(d)).length;

  const statusFiltro = STATUS_DENUNCIA_ORDEM.includes(status as StatusDenuncia)
    ? (status as StatusDenuncia)
    : null;
  const categoriaFiltro = CATEGORIAS_DENUNCIA.some((c) => c.valor === categoria)
    ? (categoria as CategoriaDenuncia)
    : null;
  const gravidadeFiltro = (["BAIXA", "MEDIA", "ALTA"] as const).includes(gravidade as GravidadeDenuncia)
    ? (gravidade as GravidadeDenuncia)
    : null;

  const casos = await prisma.denuncia.findMany({
    where: {
      empresaId,
      ...(statusFiltro ? { status: statusFiltro } : {}),
      ...(categoriaFiltro ? { categoria: categoriaFiltro } : {}),
      ...(gravidadeFiltro ? { gravidade: gravidadeFiltro } : {}),
    },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      protocolo: true,
      categoria: true,
      status: true,
      gravidade: true,
      identificado: true,
      criadoEm: true,
      prazoSlaEm: true,
      pessoa: { select: { nome: true } },
    },
  });

  function linkFiltro(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (statusFiltro) params.set("status", statusFiltro);
    if (categoriaFiltro) params.set("categoria", categoriaFiltro);
    if (gravidadeFiltro) params.set("gravidade", gravidadeFiltro);
    for (const [chave, valor] of Object.entries(overrides)) {
      if (valor === undefined) params.delete(chave);
      else params.set(chave, valor);
    }
    const qs = params.toString();
    return qs ? `/etica?${qs}` : "/etica";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Central de Ética</h1>
          <p className="text-stone-600 mt-1 text-sm">
            Canal de denúncias (NR-1) — acesso restrito a quem for marcado
            como responsável em Equipe.
          </p>
        </div>
        <a
          href="/etica/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 shrink-0"
        >
          🖨️ Gerar relatório
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="Total recebidas" valor={String(total)} />
        <Card label="Abertas" valor={String(abertas)} />
        <Card label="Finalizadas" valor={String(finalizadas)} />
        <Card label="SLA vencido" valor={String(slaVencidas)} destaque={slaVencidas > 0} />
      </div>

      <LinkPublicoBox url={linkPublico} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <FiltroLink label="Todas as etapas" ativo={!statusFiltro} href={linkFiltro({ status: undefined })} />
          {STATUS_DENUNCIA_ORDEM.map((s) => (
            <FiltroLink
              key={s}
              label={LABEL_STATUS_DENUNCIA[s]}
              ativo={statusFiltro === s}
              href={linkFiltro({ status: s })}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FiltroLink label="Todas as categorias" ativo={!categoriaFiltro} href={linkFiltro({ categoria: undefined })} />
          {CATEGORIAS_DENUNCIA.map((c) => (
            <FiltroLink
              key={c.valor}
              label={c.label}
              ativo={categoriaFiltro === c.valor}
              href={linkFiltro({ categoria: c.valor })}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FiltroLink label="Qualquer gravidade" ativo={!gravidadeFiltro} href={linkFiltro({ gravidade: undefined })} />
          <FiltroLink label="Baixa" ativo={gravidadeFiltro === "BAIXA"} href={linkFiltro({ gravidade: "BAIXA" })} />
          <FiltroLink label="Média" ativo={gravidadeFiltro === "MEDIA"} href={linkFiltro({ gravidade: "MEDIA" })} />
          <FiltroLink label="Alta" ativo={gravidadeFiltro === "ALTA"} href={linkFiltro({ gravidade: "ALTA" })} />
        </div>
      </div>

      {casos.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma denúncia encontrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {casos.map((c) => (
            <li key={c.id}>
              <Link
                href={`/etica/${c.id}`}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 hover:border-brand-300 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">
                    {c.protocolo.slice(0, 4)}-{c.protocolo.slice(4)} · {LABEL_CATEGORIA_DENUNCIA[c.categoria]}
                  </p>
                  <p className="text-xs text-stone-500">
                    {c.identificado ? c.pessoa?.nome ?? "Identificado" : "Anônimo"} ·{" "}
                    {formatarDataHora(c.criadoEm)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {slaVencido(c) && (
                    <span className="rounded-full border border-red-200 bg-red-50 text-red-700 text-[11px] font-medium px-2 py-0.5">
                      SLA vencido
                    </span>
                  )}
                  {c.gravidade && (
                    <span className={`rounded-full border text-[11px] font-medium px-2 py-0.5 ${COR_GRAVIDADE[c.gravidade]}`}>
                      {c.gravidade === "BAIXA" ? "Baixa" : c.gravidade === "MEDIA" ? "Média" : "Alta"}
                    </span>
                  )}
                  <span className={`rounded-full border text-[11px] font-medium px-2 py-0.5 ${COR_STATUS[c.status]}`}>
                    {LABEL_STATUS_DENUNCIA[c.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${destaque ? "text-red-600" : "text-navy-900"}`}>{valor}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}

function FiltroLink({ label, ativo, href }: { label: string; ativo: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        ativo ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600 hover:bg-stone-50"
      }`}
    >
      {label}
    </Link>
  );
}
