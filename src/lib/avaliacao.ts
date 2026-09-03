import type { AutorAvaliacao } from "@/generated/prisma/enums";

export type SentimentoTag = "BOA" | "MEDIA" | "RUIM";

export type TagAvaliacao = { label: string; sentimento: SentimentoTag };

/** Vocabulário fixo de tags rápidas por direção — validado aqui em vez de
 * um enum do Postgres, pra poder ajustar a lista depois sem migração. Cada
 * direção tem seu próprio conjunto porque a pergunta é diferente (o extra
 * avalia o local de trabalho; a empresa avalia o profissional).
 *
 * Cada conjunto tem uma tag boa, uma média e uma ruim — só tag positiva
 * não deixa registrar quando algo deu errado de verdade, e não seria
 * justo com quem recebe a nota. As tags negativas descrevem um fato
 * concreto (ex.: "não chegou no horário"), não um rótulo genérico tipo
 * "ruim" — protege as duas partes e ainda carrega sinal real. */
export const TAGS_EXTRA_AVALIA_EMPRESA: readonly TagAvaliacao[] = [
  { label: "Bom lugar pra trabalhar", sentimento: "BOA" },
  { label: "Trabalho puxado, mas justo", sentimento: "MEDIA" },
  { label: "Combinado não foi respeitado", sentimento: "RUIM" },
];

export const TAGS_EMPRESA_AVALIA_EXTRA: readonly TagAvaliacao[] = [
  { label: "Trabalho bem feito", sentimento: "BOA" },
  { label: "Cumpriu o combinado", sentimento: "MEDIA" },
  { label: "Não chegou no horário", sentimento: "RUIM" },
];

export function tagsValidasPara(autor: AutorAvaliacao): readonly TagAvaliacao[] {
  return autor === "EXTRA" ? TAGS_EXTRA_AVALIA_EMPRESA : TAGS_EMPRESA_AVALIA_EXTRA;
}

export function notaValida(nota: unknown): nota is number {
  return typeof nota === "number" && Number.isInteger(nota) && nota >= 1 && nota <= 5;
}

/** Filtra silenciosamente qualquer tag fora do vocabulário — nunca falha
 * a avaliação inteira por causa de uma tag inválida, só ignora. */
export function tagsValidadas(tags: unknown, autor: AutorAvaliacao): string[] {
  if (!Array.isArray(tags)) return [];
  const validas = new Set(tagsValidasPara(autor).map((t) => t.label));
  return tags.filter((t): t is string => typeof t === "string" && validas.has(t));
}
