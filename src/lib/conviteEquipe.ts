import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { filtrarModulosValidos, type ModuloEquipe } from "@/lib/modulosEquipe";

/// Mesmo padrão de token de src/lib/tokenAutenticacaoPessoa.ts
/// (randomBytes(32) hex) — diferente do padrão "link de canal"
/// (Empresa.tokenDenuncia/tokenPgr, permanente e reutilizável à
/// vontade): este token cria uma conta de verdade, então precisa expirar
/// e ser de uso único, como qualquer token de autenticação.
const VALIDADE_DIAS_CONVITE = 7;

export async function criarConviteEquipe(
  empresaId: number,
  criadoPorId: number,
  modulos: ModuloEquipe[]
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + VALIDADE_DIAS_CONVITE * 24 * 60 * 60 * 1000);
  await prisma.conviteEquipe.create({
    data: {
      empresaId,
      criadoPorId,
      token,
      modulosPermitidos: filtrarModulosValidos(modulos),
      expiraEm,
    },
  });
  return token;
}

export type ResultadoConviteValido =
  | { valido: true; conviteId: number; empresaId: number; empresaNome: string; modulosPermitidos: ModuloEquipe[] }
  | { valido: false; motivo: "invalido" | "expirado" | "usado" | "revogado" };

/** Mesma forma de buscarTokenValidoPessoa (src/lib/tokenAutenticacaoPessoa.ts)
 * — motivo distinto pra cada card de erro da página pública de resgate. */
export async function buscarConviteValido(token: string): Promise<ResultadoConviteValido> {
  const convite = await prisma.conviteEquipe.findUnique({
    where: { token },
    include: { empresa: { select: { nome: true } } },
  });
  if (!convite) return { valido: false, motivo: "invalido" };
  if (convite.revogadoEm !== null) return { valido: false, motivo: "revogado" };
  if (convite.usadoEm !== null) return { valido: false, motivo: "usado" };
  if (convite.expiraEm < new Date()) return { valido: false, motivo: "expirado" };
  return {
    valido: true,
    conviteId: convite.id,
    empresaId: convite.empresaId,
    empresaNome: convite.empresa.nome,
    modulosPermitidos: filtrarModulosValidos(convite.modulosPermitidos),
  };
}
