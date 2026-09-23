import Link from "next/link";
import { notFound } from "next/navigation";
import { requireResponsavelGed, MODELOS_PADRAO_ADVERTENCIA, TERMOS_CIENCIA_PADRAO } from "@/lib/ged";
import { prisma } from "@/lib/prisma";
import GerarDocumentoForm from "@/app/ged/pessoas/[pessoaId]/gerar/[tipo]/GerarDocumentoForm";
import type { TipoDocumentoGed } from "@/generated/prisma/enums";

const TIPOS_VALIDOS: TipoDocumentoGed[] = ["ADVERTENCIA", "SUSPENSAO", "CONTRATO_TRABALHO", "TERMO_CIENCIA"];

const TITULO: Record<TipoDocumentoGed, string> = {
  ADVERTENCIA: "Gerar advertência",
  SUSPENSAO: "Gerar suspensão",
  CONTRATO_TRABALHO: "Gerar contrato de trabalho",
  TERMO_CIENCIA: "Gerar termo de ciência",
};

/** Espelho completo de src/app/ged/pessoas/[pessoaId]/gerar/[tipo]/page.tsx
 * (v1, não tocado) — mesma query/regra; GerarDocumentoForm reaproveitado
 * direto (o único link interno dele é a rota de PDF, igual nos dois). */
export default async function V2GerarDocumentoPage({ params }: { params: Promise<{ pessoaId: string; tipo: string }> }) {
  const sessao = await requireResponsavelGed();
  const { pessoaId: pessoaIdBruto, tipo: tipoBruto } = await params;
  const pessoaId = Number(pessoaIdBruto);
  if (!Number.isInteger(pessoaId)) notFound();
  if (!TIPOS_VALIDOS.includes(tipoBruto as TipoDocumentoGed)) notFound();
  const tipo = tipoBruto as TipoDocumentoGed;

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    include: { pessoa: { select: { nome: true } } },
  });
  if (!vinculo) notFound();
  if (tipo === "CONTRATO_TRABALHO" && vinculo.tipoVinculo !== "CLT") notFound();

  const modelosPadrao: { nome: string; corpoTexto: string }[] = tipo === "ADVERTENCIA" ? [...MODELOS_PADRAO_ADVERTENCIA] : [];

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href={`/v2/ged/pessoas/${pessoaId}`} className="text-xs font-bold text-brand-700">
          ← {vinculo.pessoa.nome}
        </Link>
        <h1 className="text-xl font-extrabold text-navy-900 mt-1">{TITULO[tipo]}</h1>
      </div>

      {tipo === "SUSPENSAO" && (
        <p className="text-sm text-stone-500">
          Escolha o modelo (falta injustificada, com histórico disciplinar automático, ou motivo livre) — o resto (nome,
          empresa, período e data de retorno) é preenchido automaticamente.
        </p>
      )}

      {tipo === "CONTRATO_TRABALHO" && <p className="text-sm text-stone-500">Usa o texto padrão de contrato de trabalho CLT do sistema.</p>}

      <GerarDocumentoForm
        pessoaId={pessoaId}
        tipo={tipo}
        modelosPadrao={modelosPadrao}
        termosCiencia={tipo === "TERMO_CIENCIA" ? TERMOS_CIENCIA_PADRAO.map((t) => ({ slug: t.slug, nome: t.nome })) : []}
      />
    </div>
  );
}
