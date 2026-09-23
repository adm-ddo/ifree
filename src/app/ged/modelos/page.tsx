import Link from "next/link";
import { requireResponsavelGed, MODELOS_PADRAO_PAPEL } from "@/lib/ged";
import { extensaoPorContentType } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import UploadModeloPapelForm from "./UploadModeloPapelForm";
import RemoverModeloPapelButton from "./RemoverModeloPapelButton";

export default async function GedModelosPage() {
  const sessao = await requireResponsavelGed();

  const modelosPapelProprios = await prisma.modeloPapelGed.findMany({
    where: { empresaId: sessao.empresaEfetivoId },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/ged" className="text-sm text-brand-700 hover:underline">
          ← GED
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Modelos de papel</h1>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-stone-500">
          Modelos fixos, sem variáveis, pra imprimir e preencher (ou já usar) à mão no dia a dia.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODELOS_PADRAO_PAPEL.map((modelo) => (
            <a
              key={modelo.slug}
              href={`/ged/modelos/papel/${modelo.slug}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-stone-200 bg-white p-3 text-sm text-navy-900 hover:border-brand-400 transition-colors flex items-center justify-between"
            >
              {modelo.nome}
              <span className="text-brand-700 text-xs">🖨️ Imprimir</span>
            </a>
          ))}
        </div>

        {modelosPapelProprios.length > 0 && (
          <ul className="flex flex-col gap-2 mt-2">
            {modelosPapelProprios.map((modelo) => {
              const extensao = extensaoPorContentType(modelo.contentType);
              return (
                <li
                  key={modelo.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {extensao && (
                      <span className="shrink-0 rounded bg-stone-100 text-stone-500 text-[10px] font-semibold px-1.5 py-0.5 uppercase">
                        {extensao.slice(1)}
                      </span>
                    )}
                    <span className="text-sm text-navy-900 truncate">{modelo.nome}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={`/ged/modelos/papel/custom/${modelo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-700 hover:underline"
                    >
                      Baixar
                    </a>
                    <RemoverModeloPapelButton modeloId={modelo.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <UploadModeloPapelForm />
      </div>
    </div>
  );
}
