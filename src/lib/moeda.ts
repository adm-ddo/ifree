/** Máscara de campo de dinheiro estilo "caixa eletrônico": os dígitos
 * digitados são sempre os centavos, entrando pela direita — digitar
 * "2000" vira "20,00" progressivamente (2 -> 0,02 -> 0,20 -> 2,00 ->
 * 20,00). Mesmo princípio de build progressivo usado em cpf.ts/documento.ts
 * pra formatação de CPF/CNPJ, adaptado pra valor monetário.
 * Funciona tanto digitando quanto apagando, já que sempre reconstrói a
 * partir dos dígitos brutos restantes no campo. */
export function formatarValorMoeda(valorDigitado: string): string {
  const digitos = valorDigitado.replace(/\D/g, "");
  if (!digitos) return "";

  const comCentavos = digitos.padStart(3, "0");
  const centavos = comCentavos.slice(-2);
  const inteiro = comCentavos.slice(0, -2).replace(/^0+(?=\d)/, "");

  return `${inteiro},${centavos}`;
}
