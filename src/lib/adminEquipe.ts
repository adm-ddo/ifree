import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";

/** Master sempre pode gerenciar equipe de qualquer empresa (mesma regra de
 * usuarioEhResponsavelEtica em src/lib/etica.ts) — só dono normal/acesso
 * secundário passa pela checagem de verdade contra o campo salvo. */
export async function usuarioEhAdminEquipe(
  usuarioId: number,
  empresaId: number,
  isMaster: boolean
): Promise<boolean> {
  if (isMaster) return true;
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    select: { admin: true },
  });
  return vinculo?.admin ?? false;
}

/** Use no topo de /equipe (page e actions) no lugar de requireTenant()
 * puro — mesmo padrão de requireResponsavelEtica (src/lib/etica.ts).
 * Impede que um acesso secundário limitado (convidado por link, ver
 * ConviteEquipe) entre em /equipe e se autopromova ou convide mais
 * gente — só quem tem UsuarioEmpresa.admin=true (todo login que já
 * existia antes deste controle, mais quem for promovido depois) ou é
 * master passa. */
export async function requireAdminEquipe() {
  const sessao = await requireTenant();
  const pode = await usuarioEhAdminEquipe(sessao.usuarioId, sessao.empresaEfetivoId, sessao.isMaster);
  if (!pode) redirect("/v2/dashboard");
  return sessao;
}
