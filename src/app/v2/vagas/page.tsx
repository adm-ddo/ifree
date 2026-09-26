import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import VagaRowV2 from "@/components/v2/VagaRowV2";
import NovaVagaForm from "@/app/vagas/NovaVagaForm";
import MatchesRecentesBanner from "@/app/vagas/MatchesRecentesBanner";

/** Espelho completo de src/app/vagas/page.tsx (v1, não tocado) — mesma
 * query; NovaVagaForm reaproveitado sem alteração, VagaRowV2 é cópia do
 * VagaRow do v1 com o link atualizado pro /v2/vagas/[id] (detalhe +
 * candidatos já têm versão v2). */
export default async function V2VagasPage() {
  const sessao = await requireModulo("vagas");

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
    prisma.empresa.findUniqueOrThrow({ where: { id: sessao.empresaEfetivoId }, select: { endereco: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Vagas</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Publique vagas pro quadro do iFREE Conecta — freelancers cadastrados no Portal que estiverem
          disponíveis podem se candidatar.
        </p>
      </div>

      <MatchesRecentesBanner empresaId={sessao.empresaEfetivoId} />

      {vagas.length === 0 && <p className="text-stone-500 text-sm">Nenhuma vaga publicada ainda.</p>}

      <ul className="flex flex-col gap-2">
        {vagas.map((vaga) => (
          <VagaRowV2
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
