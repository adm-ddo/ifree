import Link from "next/link";
import { requireResponsavelGed } from "@/lib/ged";
import { prisma } from "@/lib/prisma";

/** Espelho completo de src/app/ged/page.tsx (v1, não tocado) — mesma
 * query/regra. Links vão pro /v2. */
export default async function V2GedPage() {
  const sessao = await requireResponsavelGed();

  const [totalDocumentos, totalPessoasClt] = await Promise.all([
    prisma.documentoGed.count({ where: { empresaId: sessao.empresaEfetivoId } }),
    prisma.vinculoPessoaEmpresa.count({ where: { empresaId: sessao.empresaEfetivoId, tipoVinculo: "CLT" } }),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">GED — Gestão Eletrônica de Documentos</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Advertência, suspensão, contrato, ficha de EPI e os papéis de controle que sua empresa usa no dia a dia — tudo num
          lugar só.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-stone-200 p-4">
          <p className="text-2xl font-extrabold text-navy-900">{totalDocumentos}</p>
          <p className="text-xs text-stone-500 mt-0.5">documentos gerados no total</p>
        </div>
        <div className="rounded-2xl bg-white border border-stone-200 p-4">
          <p className="text-2xl font-extrabold text-navy-900">{totalPessoasClt}</p>
          <p className="text-xs text-stone-500 mt-0.5">funcionários CLT cadastrados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/v2/ged/pessoas" className="rounded-2xl bg-white border border-stone-200 p-4">
          <h2 className="font-bold text-navy-900 text-sm">👤 Documentos por pessoa</h2>
          <p className="text-xs text-stone-500 mt-1">Advertência, suspensão, contrato, ficha de EPI e o histórico de cada colaborador.</p>
        </Link>
        <Link href="/v2/ged/regulamento" className="rounded-2xl bg-white border border-stone-200 p-4">
          <h2 className="font-bold text-navy-900 text-sm">📜 Regulamento interno</h2>
          <p className="text-xs text-stone-500 mt-1">Escreva e gere o PDF do regulamento da sua empresa.</p>
        </Link>
        <Link href="/v2/ged/modelos" className="rounded-2xl bg-white border border-stone-200 p-4">
          <h2 className="font-bold text-navy-900 text-sm">🗂️ Modelos e papéis</h2>
          <p className="text-xs text-stone-500 mt-1">Modelos de advertência/suspensão, contrato CLT, e os papéis de controle pra imprimir.</p>
        </Link>
      </div>
    </div>
  );
}
