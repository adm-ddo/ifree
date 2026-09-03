import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import VagaRow from "./VagaRow";
import NovaVagaForm from "./NovaVagaForm";

export default async function VagasPage() {
  const sessao = await requireTenant();

  const [vagas, empresa] = await Promise.all([
    prisma.vaga.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        cargo: true,
        status: true,
        criadoEm: true,
        _count: { select: { candidaturas: true } },
        candidaturas: { where: { status: "ENVIADA" }, select: { id: true } },
      },
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: { endereco: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Vagas</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Publique vagas pro quadro do iFREE Conecta — freelancers
          cadastrados no Portal que estiverem disponíveis podem se
          candidatar.
        </p>
      </div>

      {vagas.length === 0 && (
        <p className="text-stone-500 text-sm">Nenhuma vaga publicada ainda.</p>
      )}

      <ul className="flex flex-col gap-3">
        {vagas.map((vaga) => (
          <VagaRow
            key={vaga.id}
            vaga={{
              id: vaga.id,
              cargo: vaga.cargo,
              status: vaga.status,
              criadoEm: vaga.criadoEm,
              candidaturas: vaga._count.candidaturas,
              candidaturasPendentes: vaga.candidaturas.length,
            }}
          />
        ))}
      </ul>

      <NovaVagaForm localizacaoPadrao={empresa.endereco ?? ""} />
    </div>
  );
}
