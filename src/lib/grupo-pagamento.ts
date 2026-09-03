/** Cor determinística por grupo de pagamento — o mesmo grupoPagamentoId
 * sempre cai na mesma cor da paleta (id % tamanho da paleta), então todos os
 * turnos pagos juntos aparecem com a mesma tag em qualquer lista, e grupos
 * diferentes tendem a ter cores diferentes. Paleta separada das cores de
 * status (âmbar/azul/verde/vermelho/cinza, ver STATUS_CLASSE em
 * PagamentoRow) pra não confundir "o que é isso" com "que grupo é esse". */
const PALETA_GRUPO = [
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-lime-50 text-lime-700 border-lime-200",
  "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
] as const;

export function corGrupoPagamento(grupoPagamentoId: number): string {
  return PALETA_GRUPO[grupoPagamentoId % PALETA_GRUPO.length];
}
