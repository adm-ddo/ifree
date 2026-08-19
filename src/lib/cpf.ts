export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Validação completa de CPF: 11 dígitos, rejeita sequências repetidas
 * (000.000.000-00 etc.) e confere os dois dígitos verificadores — usado no
 * totem porque o CPF aqui é a chave de identificação da pessoa, não só um
 * dado de cadastro (diferente da validação leve de formato do estoque-app). */
export function cpfValido(cpfBruto: string): boolean {
  const cpf = apenasDigitos(cpfBruto);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digitos = cpf.split("").map(Number);

  const digitoVerificador = (base: number[]): number => {
    let peso = base.length + 1;
    const soma = base.reduce((acc, d) => acc + d * peso--, 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = digitoVerificador(digitos.slice(0, 9));
  if (dv1 !== digitos[9]) return false;

  const dv2 = digitoVerificador(digitos.slice(0, 10));
  if (dv2 !== digitos[10]) return false;

  return true;
}

/** Formata progressivamente — só acrescenta separador quando já existe
 * dígito pra ele. A versão anterior preenchia os dígitos que faltavam com
 * espaço (`padEnd`) e só cortava as pontas (`trim`), então um CPF parcial
 * tipo "123" virava "123.   .   -  " com espaços de verdade no meio; num
 * input controlado isso bagunça a posição do cursor e faz o backspace
 * apagar espaço em vez do dígito, dando a impressão de que "não apaga". */
export function formatarCpf(cpfBruto: string): string {
  const cpf = apenasDigitos(cpfBruto).slice(0, 11);
  let formatado = cpf.slice(0, 3);
  if (cpf.length > 3) formatado += "." + cpf.slice(3, 6);
  if (cpf.length > 6) formatado += "." + cpf.slice(6, 9);
  if (cpf.length > 9) formatado += "-" + cpf.slice(9, 11);
  return formatado;
}
