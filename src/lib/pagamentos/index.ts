import "server-only";
import type { PaymentService } from "./payment-service";
import { MockPaymentService } from "./mock-payment-service";
import { StonePaymentService } from "./stone-payment-service";
import { AsaasPaymentService } from "./asaas-payment-service";

export type { PaymentService, DadosPagamento, ResultadoPagamento } from "./payment-service";

let instancia: PaymentService | null = null;

// Nota pra quando Stone ou Asaas forem implementados de verdade (ver os
// comentários de cada classe): PAYMENT_PROVIDER liga/desliga o provedor
// pra todo mundo, mas a credencial de cada PIX enviado precisa ser por
// empresa (token/apiKey da conexão daquela empresa específica) — a troca
// de instância aqui continua fazendo sentido (ainda escolhe QUAL classe
// usar), só que enviarPagamento vai precisar resolver a credencial certa
// por dentro, olhando o empresaId em DadosPagamento, não uma credencial
// global única.
export function paymentService(): PaymentService {
  if (instancia) return instancia;

  if (process.env.PAYMENT_PROVIDER === "stone") instancia = new StonePaymentService();
  else if (process.env.PAYMENT_PROVIDER === "asaas") instancia = new AsaasPaymentService();
  else instancia = new MockPaymentService();

  return instancia;
}
