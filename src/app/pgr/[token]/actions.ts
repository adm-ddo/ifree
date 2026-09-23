"use server";

import { resolverEmpresaPorTokenPgr, criarRespostaPgrPublica } from "@/lib/pgr";
import { PERGUNTAS_PGR } from "@/lib/pgr-questionario";

export type RespostaPgrState = { erro: string } | { sucesso: true } | undefined;

/** Envia a resposta anônima da pesquisa — sem login, sem nenhum dado que
 * identifique quem respondeu (ver criarRespostaPgrPublica em
 * src/lib/pgr.ts). */
export async function enviarRespostaPgrPublica(
  token: string,
  _prev: RespostaPgrState,
  formData: FormData
): Promise<RespostaPgrState> {
  const empresa = await resolverEmpresaPorTokenPgr(token);
  if (!empresa) return { erro: "Link inválido." };

  const respostas: Record<string, number> = {};
  for (const pergunta of PERGUNTAS_PGR) {
    const bruto = Number(formData.get(pergunta.id));
    if (!Number.isInteger(bruto) || bruto < 1 || bruto > 5) {
      return { erro: "Responda todas as perguntas antes de enviar." };
    }
    respostas[pergunta.id] = bruto;
  }

  const cargo = String(formData.get("cargo") ?? "").trim() || null;

  return criarRespostaPgrPublica(empresa.id, cargo, respostas);
}
