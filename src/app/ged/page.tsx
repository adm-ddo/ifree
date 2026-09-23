import Link from "next/link";
import { requireResponsavelGed } from "@/lib/ged";
import { prisma } from "@/lib/prisma";

export default async function GedPage() {
  const sessao = await requireResponsavelGed();

  const [totalDocumentos, totalPessoasClt] = await Promise.all([
    prisma.documentoGed.count({ where: { empresaId: sessao.empresaEfetivoId } }),
    prisma.vinculoPessoaEmpresa.count({ where: { empresaId: sessao.empresaEfetivoId, tipoVinculo: "CLT" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">GED — Gestão Eletrônica de Documentos</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Advertência, suspensão, contrato, ficha de EPI e os papéis de controle que sua empresa usa no dia a dia — tudo num lugar só.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-3xl font-bold text-navy-900">{totalDocumentos}</p>
          <p className="text-xs text-stone-500 mt-0.5">documentos gerados no total</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-3xl font-bold text-navy-900">{totalPessoasClt}</p>
          <p className="text-xs text-stone-500 mt-0.5">funcionários CLT cadastrados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/ged/pessoas"
          className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:border-brand-400 transition-colors"
        >
          <h2 className="font-semibold text-navy-900">👤 Documentos por pessoa</h2>
          <p className="text-xs text-stone-500 mt-1">
            Advertência, suspensão, contrato, ficha de EPI e o histórico de cada colaborador.
          </p>
        </Link>
        <Link
          href="/ged/regulamento"
          className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:border-brand-400 transition-colors"
        >
          <h2 className="font-semibold text-navy-900">📜 Regulamento interno</h2>
          <p className="text-xs text-stone-500 mt-1">Escreva e gere o PDF do regulamento da sua empresa.</p>
        </Link>
        <Link
          href="/ged/modelos"
          className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:border-brand-400 transition-colors"
        >
          <h2 className="font-semibold text-navy-900">🗂️ Modelos e papéis</h2>
          <p className="text-xs text-stone-500 mt-1">
            Modelos de advertência/suspensão, contrato CLT, e os papéis de controle pra imprimir.
          </p>
        </Link>
      </div>
    </div>
  );
}
