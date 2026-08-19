import { apenasDigitos, cpfValido, formatarCpf } from "@/lib/cpf";
import type { TipoDocumentoPessoa, TipoChavePix } from "@/generated/prisma/enums";

export { apenasDigitos };

/** Validação completa de CNPJ: 14 dígitos, rejeita sequências repetidas e
 * confere os dois dígitos verificadores — mesmo nível de rigor do
 * `cpfValido`, usado quando o freelancer se cadastra como MEI/PJ em vez de
 * pessoa física. */
export function cnpjValido(cnpjBruto: string): boolean {
  const cnpj = apenasDigitos(cnpjBruto);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digitos = cnpj.split("").map(Number);
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digitoVerificador = (base: number[], pesos: number[]): number => {
    const soma = base.reduce((acc, d, i) => acc + d * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = digitoVerificador(digitos.slice(0, 12), pesos1);
  if (dv1 !== digitos[12]) return false;

  const dv2 = digitoVerificador(digitos.slice(0, 13), pesos2);
  if (dv2 !== digitos[13]) return false;

  return true;
}

/** Mesma lógica progressiva de `formatarCpf` — ver o comentário lá pra
 * entender por que não usa mais `padEnd`/`trim`. */
export function formatarCnpj(cnpjBruto: string): string {
  const cnpj = apenasDigitos(cnpjBruto).slice(0, 14);
  let formatado = cnpj.slice(0, 2);
  if (cnpj.length > 2) formatado += "." + cnpj.slice(2, 5);
  if (cnpj.length > 5) formatado += "." + cnpj.slice(5, 8);
  if (cnpj.length > 8) formatado += "/" + cnpj.slice(8, 12);
  if (cnpj.length > 12) formatado += "-" + cnpj.slice(12, 14);
  return formatado;
}

/** Detecta CPF (11 dígitos) vs CNPJ (14 dígitos) só pela quantidade de
 * dígitos — sem ambiguidade possível (diferente da chave PIX, onde um
 * celular com DDD também tem 11 dígitos), então não precisa de um seletor
 * manual no totem: a pessoa só digita o número e o campo se formata sozinho
 * conforme ela digita mais dígitos. */
export function detectarTipoDocumento(valorBruto: string): TipoDocumentoPessoa | null {
  const digitos = apenasDigitos(valorBruto);
  if (digitos.length === 11) return "CPF";
  if (digitos.length === 14) return "CNPJ";
  return null;
}

export function documentoValido(tipo: TipoDocumentoPessoa, valorBruto: string): boolean {
  return tipo === "CPF" ? cpfValido(valorBruto) : cnpjValido(valorBruto);
}

export function formatarDocumento(tipo: TipoDocumentoPessoa, valorBruto: string): string {
  return tipo === "CPF" ? formatarCpf(valorBruto) : formatarCnpj(valorBruto);
}

/** Formata o campo de documento do totem enquanto a pessoa digita: usa a
 * máscara de CPF até 11 dígitos e vira máscara de CNPJ a partir do 12º,
 * até o limite de 14. */
export function formatarDocumentoAuto(valorBruto: string): string {
  const digitos = apenasDigitos(valorBruto).slice(0, 14);
  return digitos.length > 11 ? formatarCnpj(digitos) : formatarCpf(digitos);
}

export const LABEL_TIPO_DOCUMENTO: Record<TipoDocumentoPessoa, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
};

export const LABEL_TIPO_CHAVE_PIX: Record<TipoChavePix, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  TELEFONE: "Telefone celular",
  ALEATORIA: "Chave aleatória",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHAVE_ALEATORIA_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validação leve da chave PIX de acordo com o tipo — pega erro de
 * digitação antes de gerar um recibo com uma chave que não bate com o tipo
 * (ex.: tipo ficou "E-mail" mas o texto digitado não tem essa cara). */
export function chavePixValida(tipo: TipoChavePix, valorBruto: string): boolean {
  const valor = valorBruto.trim();
  if (!valor) return false;
  switch (tipo) {
    case "CPF":
      return cpfValido(valor);
    case "CNPJ":
      return cnpjValido(valor);
    case "EMAIL":
      return EMAIL_REGEX.test(valor);
    case "TELEFONE": {
      const digitos = apenasDigitos(valor);
      return digitos.length === 10 || digitos.length === 11;
    }
    case "ALEATORIA":
      return CHAVE_ALEATORIA_REGEX.test(valor);
  }
}

/** Detecta sozinho o tipo da chave PIX a partir do que a pessoa digitou,
 * pra não depender de ela escolher certo num seletor manual:
 * - tem "@" → e-mail
 * - 14 dígitos → CNPJ
 * - 11 dígitos que passam na validação de CPF (dígito verificador) → CPF
 * - 11 ou 10 dígitos que NÃO validam como CPF → celular (na prática, um
 *   número de telefone real quase nunca "por acaso" bate com o dígito
 *   verificador de CPF — a chance é de ~1%)
 * - qualquer outra coisa (ex.: um UUID) → chave aleatória, o "resto" de
 *   quem não se encaixa nos formatos reconhecíveis
 */
export function detectarTipoChavePix(valorBruto: string): TipoChavePix {
  const valor = valorBruto.trim();
  if (valor.includes("@")) return "EMAIL";

  const digitos = apenasDigitos(valor);
  if (digitos.length === 14) return "CNPJ";
  if (digitos.length === 11) return cpfValido(digitos) ? "CPF" : "TELEFONE";
  if (digitos.length === 10) return "TELEFONE";

  return "ALEATORIA";
}
