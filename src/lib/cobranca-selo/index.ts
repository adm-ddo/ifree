import "server-only";
import type { CobrancaSeloService } from "./cobranca-selo-service";
import { MockCobrancaSeloService } from "./mock-cobranca-selo-service";
import { AsaasCobrancaSeloService } from "./asaas-cobranca-selo-service";

export type { CobrancaSeloService, DadosCobrancaSelo, ResultadoCobrancaSelo } from "./cobranca-selo-service";

let instancia: CobrancaSeloService | null = null;

/// Mesma env var COBRANCA_PROVIDER usada pra mensalidade da empresa (ver
/// src/lib/cobranca/index.ts) — já cobra de verdade em produção (asaas) e
/// mockado em dev, sem precisar de nenhum secret novo pro selo.
export function cobrancaSeloService(): CobrancaSeloService {
  if (instancia) return instancia;

  instancia =
    process.env.COBRANCA_PROVIDER === "asaas"
      ? new AsaasCobrancaSeloService()
      : new MockCobrancaSeloService();

  return instancia;
}
