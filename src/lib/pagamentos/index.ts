import "server-only";
import type { PaymentService } from "./payment-service";
import { MockPaymentService } from "./mock-payment-service";
import { StonePaymentService } from "./stone-payment-service";

export type { PaymentService, DadosPagamento, ResultadoPagamento } from "./payment-service";

let instancia: PaymentService | null = null;

// Nota pra quando StonePaymentService for implementado de verdade (ver seu
// comentário): PAYMENT_PROVIDER liga/desliga o provedor pra todo mundo, mas
// a credencial de cada PIX enviado precisa ser por empresa (token da
// conexão Stone OpenBank daquela empresa) — a troca de instância aqui
// continua fazendo sentido (ainda escolhe QUAL classe usar), só que
// enviarPagamento vai precisar resolver o token certo por dentro,
// olhando o empresaId do turno, não uma credencial global única.
export function paymentService(): PaymentService {
  if (instancia) return instancia;

  instancia =
    process.env.PAYMENT_PROVIDER === "stone"
      ? new StonePaymentService()
      : new MockPaymentService();

  return instancia;
}
