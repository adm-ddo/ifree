import Link from "next/link";
import { requireResponsavelGed } from "@/lib/ged";
import { prisma } from "@/lib/prisma";
import type { TipoVinculo } from "@/generated/prisma/enums";

/** Espelho completo de src/app/ged/pessoas/page.tsx (v1, não tocado) —
 * mesma query/regra. Links vão pro /v2. */
export default async function V2GedPessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string }>;
}) {
  const sessao = await requireResponsavelGed();
  const { tipo: tipoBruto, q } = await searchParams;
  const tipo: TipoVinculo = tipoBruto === "EXTRA" ? "EXTRA" : "CLT";

  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: {
      empresaId: sessao.empresaEfetivoId,
      tipoVinculo: tipo,
      ...(q?.trim() ? { pessoa: { nome: { contains: q.trim(), mode: "insensitive" } } } : {}),
    },
    select: { pessoaId: true, cargo: true, pessoa: { select: { nome: true, documento: true } } },
    orderBy: { pessoa: { nome: "asc" } },
  });

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/v2/ged" className="text-xs font-bold text-brand-700">
          ← GED
        </Link>
        <h1 className="text-xl font-extrabold text-navy-900 mt-1">Documentos por pessoa</h1>
        <p className="text-stone-500 text-sm mt-0.5">Selecione a pessoa pra gerar ou consultar documentos.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href="/v2/ged/pessoas?tipo=CLT"
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${tipo === "CLT" ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}
        >
          CLT
        </Link>
        <Link
          href="/v2/ged/pessoas?tipo=EXTRA"
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${tipo === "EXTRA" ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}
        >
          Extra
        </Link>
        <form method="GET" action="/v2/ged/pessoas" className="flex-1 min-w-[200px]">
          <input type="hidden" name="tipo" value={tipo} />
          <input type="text" name="q" defaultValue={q ?? ""} placeholder="Buscar por nome..." className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm" />
        </form>
      </div>

      {vinculos.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma pessoa encontrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vinculos.map((v) => (
            <li key={v.pessoaId}>
              <Link href={`/v2/ged/pessoas/${v.pessoaId}`} className="flex items-center justify-between rounded-xl bg-white border border-stone-200 p-3.5">
                <div>
                  <p className="font-bold text-[13px] text-navy-900">{v.pessoa.nome}</p>
                  <p className="text-[11px] text-stone-500">
                    {v.pessoa.documento}
                    {v.cargo ? ` · ${v.cargo}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
