import type { PaymentService, DadosPagamento, ResultadoPagamento } from "./payment-service";

/** Stub até termos credenciais/documentação da API de pagamentos da Stone
 * (Fase 5). As ferramentas Stone hoje conectadas neste ambiente são só
 * Open Finance somente-leitura — não enviam PIX; essa classe é o ponto de
 * integração com a API de pagamentos de verdade da Stone, ainda inexistente. */
export class StonePaymentService implements PaymentService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida pela interface PaymentService
  async enviarPagamento(dados: DadosPagamento): Promise<ResultadoPagamento> {
    throw new Error(
      "StonePaymentService ainda não implementado — aguardando credenciais/documentação da API de pagamentos da Stone (Fase 5)."
    );
  }
}
