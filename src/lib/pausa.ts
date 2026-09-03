import type { ModoPausa } from "@/generated/prisma/enums";

/** A partir de quantos minutos trabalhados o desconto automático de pausa
 * passa a valer — mesmo limiar que a CLT usa pra exigir intervalo
 * intrajornada (art. 71, jornada acima de 6h), reaproveitado pro cálculo
 * do extra/freelancer (ver calcularMinutosArredondados em
 * src/lib/turno.ts) e do CLT (ver calcularMinutosPonto em
 * src/lib/ponto.ts) — os dois usam a MESMA configuração da empresa
 * (Empresa.modoPausaDia/modoPausaNoite), não faz sentido ter limiares
 * diferentes pro mesmo conceito. Sem "server-only": pausa.ts é só
 * constantes puras, sem acesso a banco, e por isso pode ser importado por
 * arquivos que também são usados do client (ver src/lib/ponto.ts). */
export const LIMIAR_PAUSA_MIN = 360;

export const DESCONTO_POR_MODO: Record<ModoPausa, number> = {
  NENHUMA: 0,
  AUTOMATICA_30: 30,
  AUTOMATICA_60: 60,
};
