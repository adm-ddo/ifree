import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Cifra/decifra segredos que precisam ser recuperados em texto puro depois
 * (diferente de senha, que só precisa de hash — ver hashSenha em
 * src/lib/auth.ts). Primeiro uso: a apiKey da subconta Asaas de cada
 * empresa (ContaAsaasEmpresa.apiKeyCriptografada), que a gente precisa
 * mandar de volta pra Asaas em toda chamada de transferência — hash não
 * serve aqui, é obrigatório conseguir voltar pro valor original.
 *
 * AES-256-GCM: cada chamada gera um IV novo (nunca reusar IV com a mesma
 * chave), o texto cifrado sai como `${ivHex}:${tagHex}:${cifradoHex}` — os
 * três pedaços precisam estar juntos pra decifrar depois. A chave em si
 * vem de CRYPTO_SECRET_KEY (uma string qualquer, não precisa ser hex/base64
 * — scrypt deriva os 32 bytes certos a partir dela) nunca deve ser
 * commitada nem trocada depois de já existir dado cifrado com a antiga
 * (trocar a chave torna todo segredo já guardado irrecuperável). */

const ALGORITMO = "aes-256-gcm";

function chaveDerivada(): Buffer {
  const segredo = process.env.CRYPTO_SECRET_KEY;
  if (!segredo) {
    throw new Error(
      "CRYPTO_SECRET_KEY não configurada — necessária pra cifrar/decifrar segredos (ex.: apiKey da Asaas)."
    );
  }
  // Salt fixo é aceitável aqui: não estamos derivando chave de senha de
  // usuário (onde salt por-registro evita rainbow tables entre contas
  // diferentes) — é uma única chave mestra de aplicação, igual uma env var
  // comum, só passada pelo scrypt pra virar 32 bytes válidos pro AES-256.
  return scryptSync(segredo, "ifree-crypto-salt", 32);
}

export function criptografar(textoPuro: string): string {
  const iv = randomBytes(12); // 96 bits, tamanho recomendado pro GCM
  const cifra = createCipheriv(ALGORITMO, chaveDerivada(), iv);
  const cifrado = Buffer.concat([cifra.update(textoPuro, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${cifrado.toString("hex")}`;
}

/** Compara dois segredos (token de webhook, header de autenticação) em
 * tempo constante, pra não vazar quantos caracteres já bateram através da
 * diferença de tempo de resposta — `a !== b` comum já seria impraticável
 * de explorar aqui (jitter de rede), mas isso substitui todo lugar do
 * projeto que compara token de webhook, sem custo. `timingSafeEqual`
 * exige buffers do mesmo tamanho; strings de tamanho diferente são
 * tratadas como diferentes sem early-return (compara um buffer do mesmo
 * tamanho do esperado mesmo assim, pra não vazar o tamanho certo via
 * timing de uma verificação de length separada). */
export function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufB, bufB);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function descriptografar(valorCifrado: string): string {
  const partes = valorCifrado.split(":");
  if (partes.length !== 3) {
    throw new Error("Formato inválido de valor cifrado (esperado iv:tag:cifrado).");
  }
  const [ivHex, tagHex, cifradoHex] = partes;
  const decifra = createDecipheriv(ALGORITMO, chaveDerivada(), Buffer.from(ivHex, "hex"));
  decifra.setAuthTag(Buffer.from(tagHex, "hex"));
  const textoPuro = Buffer.concat([decifra.update(Buffer.from(cifradoHex, "hex")), decifra.final()]);
  return textoPuro.toString("utf8");
}
