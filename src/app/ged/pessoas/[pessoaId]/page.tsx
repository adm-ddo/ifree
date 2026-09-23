import Link from "next/link";
import { notFound } from "next/navigation";
import { requireResponsavelGed } from "@/lib/ged";
import { prisma } from "@/lib/prisma";
import UploadAssinadoForm from "./UploadAssinadoForm";
import ExcluirDocumentoGedButton from "./ExcluirDocumentoGedButton";
import { formatarDataSemHora } from "@/lib/data";

const LABEL_TIPO_DOCUMENTO: Record<string, string> = {
  ADVERTENCIA: "Advertência",
  SUSPENSAO: "Suspensão",
  CONTRATO_TRABALHO: "Contrato de trabalho",
  TERMO_CIENCIA: "Termo de ciência",
};

/// geradoEm é DateTime de verdade (instante real, não @db.Date) — aqui sim
/// o fuso de Brasília é o certo, diferente de formatarDataSemHora (usada
/// pra dataDocumento, que É @db.Date e viria um dia adiantado se
/// formatada com fuso não-UTC — ver comentário em src/lib/data.ts).
function formatarDataGeracao(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(data);
}

export default async function GedPessoaPage({ params }: { params: Promise<{ pessoaId: string }> }) {
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
  const linkCadastro = vinculo.tipoVinculo === "CLT" ? `/funcionarios/${pessoaId}` : `/freelancers/${pessoaId}`;
  const mostraRecibo =
    vinculo.tipoVinculo === "CLT" && vinculo.recebeTransporte && !vinculo.transporteComDesconto;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ged/pessoas" className="text-sm text-brand-700 hover:underline">
          ← Documentos por pessoa
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">{pessoa.nome}</h1>
        <p className="text-stone-600 mt-1 text-sm">
          {pessoa.documento} · {vinculo.tipoVinculo === "CLT" ? "CLT" : "Extra"}
          {vinculo.cargo ? ` · ${vinculo.cargo}` : ""} ·{" "}
          <Link href={linkCadastro} className="text-brand-700 hover:underline">
            ver cadastro completo
          </Link>
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-navy-900 text-sm mb-3">+ Gerar documento</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/ged/pessoas/${pessoaId}/gerar/TERMO_CIENCIA`}
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            📋 Termo de ciência
          </Link>
          <Link
            href={`/ged/pessoas/${pessoaId}/gerar/ADVERTENCIA`}
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            ⚠️ Advertência
          </Link>
          <Link
            href={`/ged/pessoas/${pessoaId}/gerar/SUSPENSAO`}
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
          >
            ⛔ Suspensão
          </Link>
          {vinculo.tipoVinculo === "CLT" && podeGerarContrato && (
            <Link
              href={`/ged/pessoas/${pessoaId}/gerar/CONTRATO_TRABALHO`}
              className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50"
            >
              📄 Contrato de trabalho
            </Link>
          )}
        </div>
        {vinculo.tipoVinculo === "CLT" && !podeGerarContrato && (
          <p className="text-xs text-amber-700 mt-3">
            Faltam dados obrigatórios (CTPS e cargo) pra gerar o contrato de trabalho —{" "}
            <Link href={linkCadastro} className="underline font-medium">
              preencha no cadastro
            </Link>
            .
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mostraRecibo && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-navy-900 text-sm">🧾 Recibo de ajuda de custo</h2>
            {vinculo.valorTransporte === null ? (
              <p className="text-xs text-amber-700 mt-1">Defina o valor da ajuda de custo no cadastro antes de gerar.</p>
            ) : (
              <a
                href={`/funcionarios/${pessoaId}/recibo-ajuda-custo/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-700 hover:underline mt-1 inline-block"
              >
                Gerar recibo do mês atual →
              </a>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-navy-900 text-sm">🦺 Ficha de EPI</h2>
          <p className="text-xs text-stone-500 mt-1">Controle de entrega de equipamentos de proteção individual.</p>
          <Link href={`/ged/pessoas/${pessoaId}/epi`} className="text-xs text-brand-700 hover:underline mt-1 inline-block">
            Ver ficha →
          </Link>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-navy-900 text-sm mb-3">Histórico de documentos</h2>
        {historico.length === 0 ? (
          <p className="text-stone-500 text-sm">Nenhum documento gerado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historico.map((doc) => (
              <li key={doc.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-navy-900">{LABEL_TIPO_DOCUMENTO[doc.tipo]}</p>
                  <p className="text-xs text-stone-500">
                    Data do documento: {formatarDataSemHora(doc.dataDocumento)} · Gerado por {doc.geradoPorEmail} em{" "}
                    {formatarDataGeracao(doc.geradoEm)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <a
                    href={`/ged/documentos/${doc.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-stone-300 text-xs px-3 py-1.5 hover:bg-stone-50"
                  >
                    📄 Ver PDF
                  </a>
                  {doc.arquivoAssinadoUrl && (
                    <>
                      <a
                        href={`/ged/documentos/${doc.id}/assinado?ver=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-brand-300 bg-brand-50 text-brand-700 text-xs px-3 py-1.5 hover:bg-brand-100"
                      >
                        👁️ Ver scan assinado
                      </a>
                      <a
                        href={`/ged/documentos/${doc.id}/assinado`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-stone-300 text-xs px-3 py-1.5 hover:bg-stone-50"
                      >
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
