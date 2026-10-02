"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";

export type CriarApiKeyState = { erro: string } | { chave: string } | undefined;

/** Gera uma chave nova pra um sistema externo (ex.: o financeiro próprio
 * da empresa) consultar /api/v1/** — ver src/lib/api-externa/auth.ts. A
 * chave completa só é devolvida UMA VEZ, aqui no retorno da action; só o
 * hash fica guardado (nem o próprio iFREE consegue mostrar ela de novo
 * depois). Formato livre (não é segredo de infraestrutura tipo JWT), só
 * precisa ser longo e aleatório o bastante — 32 bytes (256 bits) de
 * entropia é bem acima do necessário. */
export async function criarApiKeyExterna(
  _prev: CriarApiKeyState,
  formData: FormData
): Promise<CriarApiKeyState> {
  const sessao = await requireModulo("configuracoes");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) {
    return { erro: "Dê um nome pra essa chave (ex.: \"Sistema financeiro\")." };
  }

  const segredo = randomBytes(32).toString("hex");
  const chave = `ifree_${segredo}`;
  const hash = createHash("sha256").update(chave).digest("hex");

  await prisma.apiKeyExterna.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      nome,
      prefixo: chave.slice(0, 14),
      chaveHash: hash,
      criadoPorEmail: sessao.email,
    },
  });

  revalidatePath("/v2/configuracoes/api");
  return { chave };
}

export type RevogarApiKeyState = { erro: string } | { sucesso: true } | undefined;

export async function revogarApiKeyExterna(chaveId: number): Promise<RevogarApiKeyState> {
  const sessao = await requireModulo("configuracoes");

  const chave = await prisma.apiKeyExterna.findUnique({ where: { id: chaveId } });
  if (!chave || chave.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Essa chave não pertence a esta empresa." };
  }
  if (chave.revogadaEm !== null) {
    return { sucesso: true };
  }

  await prisma.apiKeyExterna.update({ where: { id: chaveId }, data: { revogadaEm: new Date() } });

  revalidatePath("/v2/configuracoes/api");
  return { sucesso: true };
}
