import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Token longo e aleatório usado no link do totem (/t/[token]/...). Não é
 * sequencial nem adivinhável — funciona como senha de acesso ao check-in
 * daquela empresa, então deve ser tratado como tal. */
export function gerarTokenTotem(): string {
  return randomBytes(24).toString("base64url");
}

export type TotemResolvido = {
  id: number;
  empresaId: number;
  empresaNome: string;
};

/** Resolve um totem pelo token público, exigindo que esteja ativo. Toda
 * action do fluxo /t/[token] passa por aqui antes de tocar dados —
 * equivalente ao requireTenant() do backoffice, mas pro contexto do kiosk. */
export async function resolverTotemAtivo(
  token: string
): Promise<TotemResolvido | null> {
  const totem = await prisma.totem.findUnique({
    where: { token },
    select: {
      id: true,
      ativo: true,
      empresaId: true,
      empresa: { select: { nome: true } },
    },
  });
  if (!totem || !totem.ativo) return null;

  return { id: totem.id, empresaId: totem.empresaId, empresaNome: totem.empresa.nome };
}
