import { randomBytes } from "node:crypto";
import type { PaymentService, DadosPagamento, ResultadoPagamento } from "./payment-service";

/** Simula o envio do PIX: pequeno atraso pra imitar uma chamada de rede
 * real, sucesso por padrão. `MOCK_PAYMENT_FORCE_FAIL=true` força falha em
 * todo pagamento — usado só pra testar o caminho ERRO_PAGAMENTO/retry. */
export class MockPaymentService implements PaymentService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida pela interface PaymentService
  async enviarPagamento(dados: DadosPagamento): Promise<ResultadoPagamento> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (process.env.MOCK_PAYMENT_FORCE_FAIL === "true") {
      return { sucesso: false, erro: "Falha simulada (MOCK_PAYMENT_FORCE_FAIL=true)." };
    }

    return {
      sucesso: true,
      idTransacaoExterna: `mock_${randomBytes(8).toString("hex")}`,
      final: true,
    };
  }
}
