import Link from "next/link";
import { requireResponsavelGed, resolverRegulamentoInterno } from "@/lib/ged";
import { termosParaTexto } from "@/lib/termos";
import { prisma } from "@/lib/prisma";
import RegulamentoForm from "./RegulamentoForm";

export default async function RegulamentoPage() {
  const sessao = await requireResponsavelGed();
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, cnpj: true, regulamentoInterno: true },
  });

  const personalizado = Boolean(empresa.regulamentoInterno?.trim());
  const paragrafosResolvidos = resolverRegulamentoInterno(empresa.regulamentoInterno, empresa.nome, empresa.cnpj);
  const textoInicial = termosParaTexto(paragrafosResolvidos);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ged" className="text-sm text-brand-700 hover:underline">
          ← GED
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Regulamento interno</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Já vem com um modelo pronto pra você editar — nome e CNPJ da empresa são preenchidos automaticamente.
        </p>
        <a
          href="/ged/regulamento/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-700 hover:underline mt-1 inline-block"
        >
          🖨️ Gerar PDF
        </a>
      </div>

      <RegulamentoForm textoInicial={textoInicial} personalizado={personalizado} />
    </div>
  );
}
