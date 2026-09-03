/** Como a pessoa costuma chegar no trabalho — importa pra empresa que tem
 * turno de madrugada ou fora do horário do transporte público saber se
 * ela consegue cumprir. Vocabulário fechado (diferente de habilidades e
 * vagas desejadas, que são texto livre): transporte no Brasil cabe bem
 * numa lista curta e fixa, sem precisar de campo customizado. */
export const MEIOS_TRANSPORTE: readonly string[] = [
  "Carro próprio",
  "Moto própria",
  "Transporte público",
  "Aplicativo (Uber/99/táxi)",
  "Bicicleta",
  "A pé",
  "Carona",
];

/** Descarta silenciosamente qualquer valor fora do vocabulário — mesmo
 * espírito de tagsValidadas (src/lib/avaliacao.ts): nunca confia no que
 * chegou do client. */
export function meiosTransporteValidos(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const validos = new Set(MEIOS_TRANSPORTE);
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const item of input) {
    if (typeof item !== "string" || !validos.has(item) || vistos.has(item)) continue;
    vistos.add(item);
    resultado.push(item);
  }
  return resultado;
}
