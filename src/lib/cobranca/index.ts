import "server-only";
import type { CobrancaService } from "./cobranca-service";
import { MockCobrancaService } from "./mock-cobranca-service";
import { PagarmeCobrancaService } from "./pagarme-cobranca-service";

export type { CobrancaService, DadosCobranca, ResultadoCobranca } from "./cobranca-service";

let instancia: CobrancaService | null = null;

export function cobrancaService(): CobrancaService {
  if (instancia) return instancia;

  instancia =
    process.env.COBRANCA_PROVIDER === "pagarme"
      ? new PagarmeCobrancaService()
      : new MockCobrancaService();

  return instancia;
}
