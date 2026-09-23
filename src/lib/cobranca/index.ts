import "server-only";
import type { CobrancaService } from "./cobranca-service";
import { MockCobrancaService } from "./mock-cobranca-service";
import { PagarmeCobrancaService } from "./pagarme-cobranca-service";
import { AsaasCobrancaService } from "./asaas-cobranca-service";

export type { CobrancaService, DadosCobranca, ResultadoCobranca } from "./cobranca-service";

let instancia: CobrancaService | null = null;

/// asaas é o provedor real desde 2026-09-08 (reaproveita a conta-mãe já
/// validada em produção pra pagar os extras) — pagarme fica só de exemplo
/// de como trocar de provedor, nunca chegou a rodar com credencial real.
export function cobrancaService(): CobrancaService {
  if (instancia) return instancia;

  instancia =
    process.env.COBRANCA_PROVIDER === "asaas"
      ? new AsaasCobrancaService()
      : process.env.COBRANCA_PROVIDER === "pagarme"
        ? new PagarmeCobrancaService()
        : new MockCobrancaService();

  return instancia;
}
