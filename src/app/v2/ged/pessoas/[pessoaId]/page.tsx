import Link from "next/link";
import { notFound } from "next/navigation";
import { requireResponsavelGed } from "@/lib/ged";
import { prisma } from "@/lib/prisma";
import UploadAssinadoForm from "@/app/ged/pessoas/[pessoaId]/UploadAssinadoForm";
import ExcluirDocumentoGedButton from "@/app/ged/pessoas/[pessoaId]/ExcluirDocumentoGedButton";
import { formatarDataSemHora } from "@/lib/data";

const LABEL_TIPO_DOCUMENTO: Record<string, string> = {
  ADVERTENCIA: "Advertência",
  SUSPENSAO: "Suspensão",
  CONTRATO_TRABALHO: "Contrato de trabalho",
  TERMO_CIENCIA: "Termo de ciência",
};

function formatarDataGeracao(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(data);
}

/** Espelho completo de src/app/ged/pessoas/[pessoaId]/page.tsx (v1, não
 * tocado) — mesma query/regra; UploadAssinadoForm reaproveitado direto.
 * Link "ver cadastro completo" agora vai pro /v2/funcionarios ou
 * /v2/freelancers (já existem); resto dos links internos vai pro
 * /v2/ged. */
export default async function V2GedPessoaPage({ params }: { params: Promise<{ pessoaId: string }> }) {
  const sessao = await requireResponsavelGed();
  const { pessoaId: pessoaIdBruto } = await params;
  const pessoaId = Number(pessoaIdBruto);
  if (!Number.isInteger(pessoaId)) notFound();

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    include: { pessoa: true },
  });
  if (!vinculo) notFound();
  const { pessoa } = vinculo;

  const historico = await prisma.documentoGed.findMany({
    where: { empresaId: sessao.empresaEfetivoId, pessoaId },
    orderBy: { geradoEm: "desc" },
  });

  const podeGerarContrato = Boolean(pessoa.ctpsNumero && pessoa.ctpsSerieUf && vinculo.cargo);
  const linkCadastro = vinculo.tipoVinculo === "CLT" ? `/v2/funcionarios/${pessoaId}` : `/v2/freelancers/${pessoaId}`;
  const mostraRecibo = vinculo.tipoVinculo === "CLT" && vinculo.recebeTransporte && !vinculo.transporteComDesconto;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/v2/ged/pessoas" className="text-xs font-bold text-brand-700">
          ← Documentos por pessoa
        </Link>
        <h1 className="text-xl font-extrabold text-navy-900 mt-1">{pessoa.nome}</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          {pessoa.documento} · {vinculo.tipoVinculo === "CLT" ? "CLT" : "Extra"}
          {vinculo.cargo ? ` · ${vinculo.cargo}` : ""} ·{" "}
          <Link href={linkCadastro} className="text-brand-700 underline">
            ver cadastro completo
          </Link>
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4">
        <h2 className="font-bold text-navy-900 text-sm mb-3">+ Gerar documento</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/v2/ged/pessoas/${pessoaId}/gerar/TERMO_CIENCIA`} className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2">
            📋 Termo de ciência
          </Link>
          <Link href={`/v2/ged/pessoas/${pessoaId}/gerar/ADVERTENCIA`} className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2">
            ⚠️ Advertência
          </Link>
          <Link href={`/v2/ged/pessoas/${pessoaId}/gerar/SUSPENSAO`} className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2">
            ⛔ Suspensão
          </Link>
          {vinculo.tipoVinculo === "CLT" && podeGerarContrato && (
            <Link href={`/v2/ged/pessoas/${pessoaId}/gerar/CONTRATO_TRABALHO`} className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2">
              📄 Contrato de trabalho
            </Link>
          )}
        </div>
        {vinculo.tipoVinculo === "CLT" && !podeGerarContrato && (
          <p className="text-xs text-amber-700 mt-3">
            Faltam dados obrigatórios (CTPS e cargo) pra gerar o contrato de trabalho —{" "}
            <Link href={linkCadastro} className="underline font-bold">
              preencha no cadastro
            </Link>
            .
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mostraRecibo && (
          <div className="rounded-2xl bg-white border border-stone-200 p-4">
            <h2 className="font-bold text-navy-900 text-sm">🧾 Recibo de ajuda de custo</h2>
            {vinculo.valorTransporte === null ? (
              <p className="text-xs text-amber-700 mt-1">Defina o valor da ajuda de custo no cadastro antes de gerar.</p>
            ) : (
              <a href={`/funcionarios/${pessoaId}/recibo-ajuda-custo/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-700 underline mt-1 inline-block">
                Gerar recibo do mês atual →
              </a>
            )}
          </div>
        )}
        <div className="rounded-2xl bg-white border border-stone-200 p-4">
          <h2 className="font-bold text-navy-900 text-sm">🦺 Ficha de EPI</h2>
          <p className="text-xs text-stone-500 mt-1">Controle de entrega de equipamentos de proteção individual.</p>
          <Link href={`/v2/ged/pessoas/${pessoaId}/epi`} className="text-xs text-brand-700 underline mt-1 inline-block">
            Ver ficha →
          </Link>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-navy-900 text-sm mb-3">Histórico de documentos</h2>
        {historico.length === 0 ? (
          <p className="text-stone-500 text-sm">Nenhum documento gerado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historico.map((doc) => (
              <li key={doc.id} className="rounded-xl bg-white border border-stone-200 p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-[13px] text-navy-900">{LABEL_TIPO_DOCUMENTO[doc.tipo]}</p>
                  <p className="text-[11px] text-stone-500">
                    Data do documento: {formatarDataSemHora(doc.dataDocumento)} · Gerado por {doc.geradoPorEmail} em {formatarDataGeracao(doc.geradoEm)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <a href={`/ged/documentos/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-stone-200 text-[11px] font-bold px-3 py-1.5">
                    📄 Ver PDF
                  </a>
                  {doc.arquivoAssinadoUrl && (
                    <>
                      <a href={`/ged/documentos/${doc.id}/assinado?ver=1`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-brand-300 bg-brand-50 text-brand-700 text-[11px] font-bold px-3 py-1.5">
                        👁️ Ver scan assinado
                      </a>
                      <a href={`/ged/documentos/${doc.id}/assinado`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-stone-200 text-[11px] font-bold px-3 py-1.5">
                        ⬇️ Baixar
                      </a>
                    </>
                  )}
                  <UploadAssinadoForm documentoId={doc.id} jaAnexado={!!doc.arquivoAssinadoUrl} />
                  {sessao.isMaster && <ExcluirDocumentoGedButton documentoId={doc.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
