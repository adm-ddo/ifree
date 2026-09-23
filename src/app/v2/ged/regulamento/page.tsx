import Link from "next/link";
import { requireResponsavelGed, resolverRegulamentoInterno } from "@/lib/ged";
import { termosParaTexto } from "@/lib/termos";
import { prisma } from "@/lib/prisma";
import RegulamentoForm from "@/app/ged/regulamento/RegulamentoForm";

/** Espelho completo de src/app/ged/regulamento/page.tsx (v1, não tocado)
 * — mesma query/regra; RegulamentoForm reaproveitado direto. */
export default async function V2RegulamentoPage() {
  const sessao = await requireResponsavelGed();
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, cnpj: true, regulamentoInterno: true },
  });

  const personalizado = Boolean(empresa.regulamentoInterno?.trim());
  const paragrafosResolvidos = resolverRegulamentoInterno(empresa.regulamentoInterno, empresa.nome, empresa.cnpj);
  const textoInicial = termosParaTexto(paragrafosResolvidos);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/v2/ged" className="text-xs font-bold text-brand-700">
          ← GED
        </Link>
        <h1 className="text-xl font-extrabold text-navy-900 mt-1">Regulamento interno</h1>
        <p className="text-stone-500 text-sm mt-0.5">Já vem com um modelo pronto pra você editar — nome e CNPJ da empresa são preenchidos automaticamente.</p>
        <a href="/ged/regulamento/pdf" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand-700 mt-1 inline-block">
          🖨️ Gerar PDF
        </a>
      </div>

      <RegulamentoForm textoInicial={textoInicial} personalizado={personalizado} />
    </div>
  );
}
