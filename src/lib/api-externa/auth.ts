import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type AuthApiExterna = { empresaId: number } | { erro: string; status: number };

/** Autentica uma chamada de sistema externo (ex.: o financeiro próprio da
 * empresa, ver src/app/api/v1/financeiro/**) via `Authorization: Bearer
 * <chave>`. Comparação é por hash (SHA-256) indexado no banco, não por
 * comparação em memória — igual não precisa de timingSafeEqual (ver
 * compararSeguro em src/lib/crypto.ts) porque não estamos comparando a
 * chave recebida contra UM valor esperado conhecido (onde o tempo de
 * resposta vazaria quantos caracteres bateram); aqui é uma busca de
 * igualdade exata num índice único — não existe "quase bateu". */
export async function autenticarApiExterna(request: Request): Promise<AuthApiExterna> {
  const cabecalho = request.headers.get("authorization");
  if (!cabecalho?.startsWith("Bearer ")) {
    return { erro: "Cabeçalho Authorization: Bearer <chave> ausente.", status: 401 };
  }
  const chave = cabecalho.slice("Bearer ".length).trim();
  if (!chave) {
    return { erro: "Chave vazia.", status: 401 };
  }

  const hash = createHash("sha256").update(chave).digest("hex");
  const registro = await prisma.apiKeyExterna.findUnique({ where: { chaveHash: hash } });
  if (!registro || registro.revogadaEm !== null) {
    return { erro: "Chave inválida ou revogada.", status: 401 };
  }

  // Best-effort — não atrasa nem derruba a resposta se falhar.
  prisma.apiKeyExterna
    .update({ where: { id: registro.id }, data: { ultimoUsoEm: new Date() } })
    .catch(() => {});

  return { empresaId: registro.empresaId };
}
