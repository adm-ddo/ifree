import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import type { ModuloEquipe } from "@/lib/modulosEquipe";

/** Master sempre tem acesso total (mesma regra de usuarioEhResponsavelEtica
 * em src/lib/etica.ts) — só dono normal/acesso secundário passa pela
 * checagem de verdade contra o array salvo. */
export async function usuarioTemModulo(
  usuarioId: number,
  empresaId: number,
  modulo: ModuloEquipe,
  isMaster: boolean
): Promise<boolean> {
  if (isMaster) return true;
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    select: { modulosPermitidos: true },
  });
  return vinculo?.modulosPermitidos.includes(modulo) ?? false;
}

/** Use no topo de toda page/action de um módulo do catálogo
 * (src/lib/modulosEquipe.ts), no lugar de requireTenant() puro — mesmo
 * padrão de requireResponsavelEtica (src/lib/etica.ts): chama
 * requireTenant() primeiro (garante empresa selecionada e assinatura em
 * dia), depois barra quem não tem o módulo liberado, redirecionando pro
 * dashboard. Bloqueia de verdade no servidor — mesmo digitando a URL ou
 * chamando a action direto. */
export async function requireModulo(modulo: ModuloEquipe) {
  const sessao = await requireTenant();
  const pode = await usuarioTemModulo(sessao.usuarioId, sessao.empresaEfetivoId, modulo, sessao.isMaster);
  if (!pode) redirect("/v2/dashboard");
  return sessao;
}
