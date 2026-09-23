import { requireAdminEquipe } from "@/lib/adminEquipe";
import { prisma } from "@/lib/prisma";
import MembroRow from "@/app/equipe/MembroRow";
import ConvidarPorLinkForm from "@/app/equipe/ConvidarPorLinkForm";
import ConvitesEquipeList, { type ConviteEquipeResumo } from "@/app/equipe/ConvitesEquipeList";
import { filtrarModulosValidos } from "@/lib/modulosEquipe";

/** Espelho completo de src/app/equipe/page.tsx (v1, não tocado) — mesma
 * query, componentes reaproveitados direto (nenhum tem link pro v1). */
export default async function V2EquipePage() {
  const sessao = await requireAdminEquipe();
  const empresaId = sessao.empresaEfetivoId;

  const [membros, convites] = await Promise.all([
    prisma.usuario.findMany({
      where: {
        id: { not: sessao.usuarioId },
        isMaster: false,
        empresas: { some: { empresaId } },
      },
      orderBy: [{ nomeCompleto: "asc" }, { email: "asc" }],
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        empresas: {
          where: { empresaId },
          select: { responsavelEtica: true, responsavelGed: true, responsavelPgr: true, modulosPermitidos: true },
        },
      },
    }),
    prisma.conviteEquipe.findMany({
      where: { empresaId },
      orderBy: { criadoEm: "desc" },
      take: 30,
      select: {
        id: true,
        modulosPermitidos: true,
        criadoEm: true,
        expiraEm: true,
        usadoEm: true,
        revogadoEm: true,
        usadoPor: { select: { nomeCompleto: true, email: true } },
      },
    }),
  ]);

  const convitesResumo: ConviteEquipeResumo[] = convites.map((c) => ({
    id: c.id,
    modulosPermitidos: filtrarModulosValidos(c.modulosPermitidos),
    criadoEm: c.criadoEm.toISOString(),
    expiraEm: c.expiraEm.toISOString(),
    usadoEm: c.usadoEm?.toISOString() ?? null,
    usadoPorNome: c.usadoPor?.nomeCompleto ?? c.usadoPor?.email ?? null,
    revogadoEm: c.revogadoEm?.toISOString() ?? null,
  }));

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Equipe</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Convide pessoas pra {sessao.empresaEfetivoNome} com só os módulos que
          você marcar — cada uma escolhe a própria senha no primeiro acesso.
        </p>
      </div>

      <ConvidarPorLinkForm />

      <ConvitesEquipeList convites={convitesResumo} />

      <div>
        <h2 className="font-bold text-navy-900 mb-2 text-[13px]">Acessos existentes</h2>
        {membros.length === 0 ? (
          <p className="text-stone-500 text-sm">Nenhum acesso secundário criado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {membros.map((membro) => (
              <MembroRow
                key={membro.id}
                membro={{
                  usuarioId: membro.id,
                  nomeCompleto: membro.nomeCompleto,
                  email: membro.email,
                  responsavelEtica: membro.empresas[0]?.responsavelEtica ?? false,
                  responsavelGed: membro.empresas[0]?.responsavelGed ?? false,
                  responsavelPgr: membro.empresas[0]?.responsavelPgr ?? false,
                  modulosPermitidos: filtrarModulosValidos(membro.empresas[0]?.modulosPermitidos ?? []),
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
