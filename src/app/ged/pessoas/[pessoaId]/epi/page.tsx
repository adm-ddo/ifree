import Link from "next/link";
import { notFound } from "next/navigation";
import { requireResponsavelGed } from "@/lib/ged";
import { prisma } from "@/lib/prisma";
import AdicionarEntradaEpiForm from "./AdicionarEntradaEpiForm";
import RemoverEntradaEpiButton from "./RemoverEntradaEpiButton";
import { formatarDataSemHora as formatarData } from "@/lib/data";

export default async function FichaEpiPage({ params }: { params: Promise<{ pessoaId: string }> }) {
  const sessao = await requireResponsavelGed();
  const { pessoaId: pessoaIdBruto } = await params;
  const pessoaId = Number(pessoaIdBruto);
  if (!Number.isInteger(pessoaId)) notFound();

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    select: { pessoa: { select: { nome: true } } },
  });
  if (!vinculo) notFound();

  const entradas = await prisma.entradaEpi.findMany({
    where: { empresaId: sessao.empresaEfetivoId, pessoaId },
    orderBy: { dataEntrega: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/ged/pessoas/${pessoaId}`} className="text-sm text-brand-700 hover:underline">
          ← {vinculo.pessoa.nome}
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Ficha de EPI</h1>
        {entradas.length > 0 && (
          <a
            href={`/ged/pessoas/${pessoaId}/epi/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-700 hover:underline mt-1 inline-block"
          >
            🖨️ Gerar PDF consolidado
          </a>
        )}
      </div>

      <AdicionarEntradaEpiForm pessoaId={pessoaId} />

      {entradas.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhuma entrega registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entradas.map((entrada) => (
            <li
              key={entrada.id}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium text-navy-900">
                  {entrada.item} <span className="text-stone-500 font-normal">× {entrada.quantidade}</span>
                  {entrada.valorUnitario !== null && (
                    <span className="text-stone-500 font-normal">
                      {" "}
                      · R$ {Number(entrada.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-500">
                  {formatarData(entrada.dataEntrega)}
                  {entrada.numeroCA ? ` · C.A. ${entrada.numeroCA}` : ""}
                  {entrada.observacao ? ` · ${entrada.observacao}` : ""}
                </p>
              </div>
              <RemoverEntradaEpiButton entradaId={entrada.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
