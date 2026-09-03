/** Match entre uma Vaga e uma Pessoa — pelo menos LIMIAR_MATCH habilidades
 * em comum entre o que a empresa procura e o que a pessoa já sabe fazer.
 * Calculado uma vez no momento da candidatura (candidatarSe, src/app/portal/vagas/actions.ts)
 * e congelado ali — não recalcula se as habilidades de alguém mudarem
 * depois, pra não fazer um match aparecer/sumir sozinho. */
export const LIMIAR_MATCH = 3;

export function calcularMatch(
  habilidadesProcuradas: string[],
  habilidadesPessoa: string[]
): boolean {
  const setPessoa = new Set(habilidadesPessoa.map((h) => h.toLowerCase()));
  const comuns = habilidadesProcuradas.filter((h) => setPessoa.has(h.toLowerCase()));
  return comuns.length >= LIMIAR_MATCH;
}
