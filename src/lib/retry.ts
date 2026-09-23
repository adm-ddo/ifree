import "server-only";
import { Prisma } from "@/generated/prisma/client";

/// P2028 = "Transaction API error: Unable to start a transaction in the
/// given time" (estourou o pool tentando abrir uma transação) e P2024 =
/// "Timed out fetching a new connection from the pool" (mesma causa, fora
/// de uma transação). Confirmado com um teste de carga controlado em
/// 2026-09-19 (pedido do Thiago): com o pool de 3 conexões por instância
/// (ver src/lib/prisma.ts) e teto de 50 conexões no banco, uma rajada de
/// ~100 check-ins simultâneos derrubou 100% das aberturas de turno com
/// exatamente esse erro. Isso não substitui resolver a causa raiz (mais
/// conexões/pooler de verdade no banco) — é uma rede de segurança pra
/// picos passageiros não virarem "erro" na cara de quem só queria bater
/// ponto ao mesmo tempo que outras pessoas.
const CODIGOS_POOL_OCUPADO = new Set(["P2028", "P2024"]);

function ehErroDePoolOcupado(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && CODIGOS_POOL_OCUPADO.has(err.code);
}

/** Mensagem pronta pra devolver como `{ erro }` quando comRetentativaDePool
 * esgota as tentativas — mais específica que um erro genérico, porque a
 * causa (sistema ocupado) é diferente de um erro de negócio de verdade e
 * pede uma ação diferente da pessoa (esperar um pouco, não corrigir dado
 * nenhum). */
export const MENSAGEM_ERRO_POOL_OCUPADO =
  "O sistema está processando muitos pedidos ao mesmo tempo agora. Aguarde alguns segundos e tente de novo.";

/** Tenta de novo só quando o erro é especificamente pool de conexão
 * ocupado (ver CODIGOS_POOL_OCUPADO) — qualquer outro erro (validação,
 * regra de negócio, bug de verdade) sobe na hora, repetir não ajudaria e
 * só atrasaria a resposta de um erro que já era pra aparecer. Espera
 * crescente entre tentativas (300ms, 800ms) — dá um respiro pro pico de
 * acessos simultâneos aliviar sem fazer quem está no totem esperar demais
 * (pior caso aqui: ~1,1s a mais antes de decidir que precisa mesmo pedir
 * pra pessoa tentar de novo). */
export async function comRetentativaDePool<T>(fn: () => Promise<T>, tentativas = 3): Promise<T> {
  const esperasMs = [300, 800];
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await fn();
    } catch (err) {
      if (!ehErroDePoolOcupado(err) || tentativa >= tentativas - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, esperasMs[tentativa] ?? 800));
    }
  }
}

/** Mesma ideia de comRetentativaDePool, mas já devolvendo o formato
 * `{ erro: string }` que toda action do totem usa em vez de deixar a
 * exceção subir — pensado pra envolver só a escrita final de cada action
 * (iniciarTurno, concluirTurno, baterPontoClt), depois que qualquer
 * validação/leitura anterior já passou. Erros que não são de pool ocupado
 * sobem normalmente (viram o error boundary padrão do Next.js, igual
 * qualquer bug de verdade já se comportava antes). */
export async function comRetentativaDePoolOuErro<T>(fn: () => Promise<T>): Promise<T | { erro: string }> {
  try {
    return await comRetentativaDePool(fn);
  } catch (err) {
    if (ehErroDePoolOcupado(err)) return { erro: MENSAGEM_ERRO_POOL_OCUPADO };
    throw err;
  }
}
