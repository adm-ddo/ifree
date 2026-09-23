import Link from "next/link";
import { requireResponsavelGed } from "@/lib/ged";
import { prisma } from "@/lib/prisma";
import type { TipoVinculo } from "@/generated/prisma/enums";

export default async function GedPessoasPage({
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
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ged" className="text-sm text-brand-700 hover:underline">
          ← GED
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Documentos por pessoa</h1>
        <p className="text-stone-600 mt-1 text-sm">Selecione a pessoa pra gerar ou consultar documentos.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/ged/pessoas?tipo=CLT"
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            tipo === "CLT" ? "bg-brand-600 border-brand-600 text-white" : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          CLT
        </Link>
        <Link
          href="/ged/pessoas?tipo=EXTRA"
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            tipo === "EXTRA" ? "bg-brand-600 border-brand-600 text-white" : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Extra
        </Link>
        <form method="GET" className="flex-1 min-w-[200px]">
          <input type="hidden" name="tipo" value={tipo} />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome..."
            className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>
      </div>

      {vinculos.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma pessoa encontrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vinculos.map((v) => (
            <li key={v.pessoaId}>
              <Link
                href={`/ged/pessoas/${v.pessoaId}`}
                className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:border-brand-400 transition-colors"
              >
                <div>
                  <p className="font-medium text-navy-900">{v.pessoa.nome}</p>
                  <p className="text-xs text-stone-500">
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
