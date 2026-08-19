import "server-only";
import type { PaymentService } from "./payment-service";
import { MockPaymentService } from "./mock-payment-service";
import { StonePaymentService } from "./stone-payment-service";

export type { PaymentService, DadosPagamento, ResultadoPagamento } from "./payment-service";

let instancia: PaymentService | null = null;

export function paymentService(): PaymentService {
  if (instancia) return instancia;

  instancia =
    process.env.PAYMENT_PROVIDER === "stone"
      ? new StonePaymentService()
      : new MockPaymentService();

  return instancia;
}
