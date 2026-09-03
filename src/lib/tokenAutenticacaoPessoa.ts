import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TipoTokenAutenticacao } from "@/generated/prisma/enums";

/** Mesma ideia de src/lib/tokenAutenticacao.ts, mas pra Pessoa (Portal do
 * freelancer) — tabela própria (TokenAutenticacaoPessoa), zero
 * acoplamento com o token de Usuario. */
export async function criarTokenAutenticacaoPessoa(
  pessoaId: number,
  tipo: TipoTokenAutenticacao,
  horasValidade: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + horasValidade * 60 * 60 * 1000);
  await prisma.tokenAutenticacaoPessoa.create({ data: { token, pessoaId, tipo, expiraEm } });
  return token;
}

export type ResultadoTokenValidoPessoa =
  | { valido: true; pessoaId: number; tokenId: number }
  | { valido: false; motivo: "invalido" | "expirado" | "usado" };

export async function buscarTokenValidoPessoa(
  token: string,
  tipo: TipoTokenAutenticacao
): Promise<ResultadoTokenValidoPessoa> {
  const registro = await prisma.tokenAutenticacaoPessoa.findUnique({ where: { token } });
  if (!registro || registro.tipo !== tipo) return { valido: false, motivo: "invalido" };
  if (registro.usadoEm !== null) return { valido: false, motivo: "usado" };
  if (registro.expiraEm < new Date()) return { valido: false, motivo: "expirado" };
  return { valido: true, pessoaId: registro.pessoaId, tokenId: registro.id };
}

export async function tokenRecenteExistePessoa(
  pessoaId: number,
  tipo: TipoTokenAutenticacao,
  minutosCooldown: number
): Promise<boolean> {
  const desde = new Date(Date.now() - minutosCooldown * 60 * 1000);
  const recente = await prisma.tokenAutenticacaoPessoa.findFirst({
    where: {
      pessoaId,
      tipo,
      usadoEm: null,
      criadoEm: { gte: desde },
      expiraEm: { gt: new Date() },
    },
  });
  return recente !== null;
}
