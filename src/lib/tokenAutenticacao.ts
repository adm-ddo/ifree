import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TipoTokenAutenticacao } from "@/generated/prisma/enums";

/** Cria um token de uso único (verificação de e-mail ou recuperação de
 * senha) — mesmo padrão randomBytes(32) em hex já usado por Sessao/Totem
 * (src/lib/auth.ts), só que de vida curta e marcado como usado depois
 * de consumido. `horasValidade` controla o TTL (24h pra verificação, 1h
 * pra recuperação — bem menor que os 30 dias de uma Sessao normal). */
export async function criarTokenAutenticacao(
  usuarioId: number,
  tipo: TipoTokenAutenticacao,
  horasValidade: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + horasValidade * 60 * 60 * 1000);
  await prisma.tokenAutenticacao.create({ data: { token, usuarioId, tipo, expiraEm } });
  return token;
}

export type ResultadoTokenValido =
  | { valido: true; usuarioId: number; tokenId: number }
  | { valido: false; motivo: "invalido" | "expirado" | "usado" };

/** Busca e valida um token (existe, tipo bate, não expirou, não foi
 * usado) sem marcá-lo como consumido — quem chama decide quando marcar
 * `usadoEm`, normalmente dentro da mesma transação que já usa o token
 * pra alguma coisa (ex.: trocar a senha). */
export async function buscarTokenValido(
  token: string,
  tipo: TipoTokenAutenticacao
): Promise<ResultadoTokenValido> {
  const registro = await prisma.tokenAutenticacao.findUnique({ where: { token } });
  if (!registro || registro.tipo !== tipo) return { valido: false, motivo: "invalido" };
  if (registro.usadoEm !== null) return { valido: false, motivo: "usado" };
  if (registro.expiraEm < new Date()) return { valido: false, motivo: "expirado" };
  return { valido: true, usuarioId: registro.usuarioId, tokenId: registro.id };
}

/** Cooldown simples pra evitar spam de "reenviar" — não deixa criar
 * token novo se já existe um válido (não usado, não expirado) do mesmo
 * tipo criado há menos de `minutosCooldown`. */
export async function tokenRecenteExiste(
  usuarioId: number,
  tipo: TipoTokenAutenticacao,
  minutosCooldown: number
): Promise<boolean> {
  const desde = new Date(Date.now() - minutosCooldown * 60 * 1000);
  const recente = await prisma.tokenAutenticacao.findFirst({
    where: {
      usuarioId,
      tipo,
      usadoEm: null,
      criadoEm: { gte: desde },
      expiraEm: { gt: new Date() },
    },
  });
  return recente !== null;
}
