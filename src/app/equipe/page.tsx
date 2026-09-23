import { requireAdminEquipe } from "@/lib/adminEquipe";
import { prisma } from "@/lib/prisma";
import MembroRow from "./MembroRow";
import ConvidarPorLinkForm from "./ConvidarPorLinkForm";
import ConvitesEquipeList, { type ConviteEquipeResumo } from "./ConvitesEquipeList";
import { filtrarModulosValidos } from "@/lib/modulosEquipe";

/** Escopada só à empresa atual da sessão (sessao.empresaEfetivoId) —
 * nunca mostra nem mexe nas outras empresas do login (mesmo se o dono
 * tiver várias, ou se for o master navegando dentro de uma empresa de
 * cliente). Ver requireAdminEquipe (src/lib/adminEquipe.ts): só quem
 * tem UsuarioEmpresa.admin=true nesta empresa (ou é master) chega até
 * aqui — um acesso convidado por link nunca gerencia a própria
 * equipe. */
export default async function EquipePage() {
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Equipe</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Convide pessoas pra {sessao.empresaEfetivoNome} com só os módulos que
          você marcar — cada uma escolhe a própria senha no primeiro acesso.
        </p>
      </div>

      <ConvidarPorLinkForm />

      <ConvitesEquipeList convites={convitesResumo} />

      <div>
        <h2 className="font-semibold text-navy-900 mb-2">Acessos existentes</h2>
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
