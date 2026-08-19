export type DadosPagamento = {
  turnoId: number;
  valor: number;
  chavePixDestino: string;
};

export type ResultadoPagamento =
  | { sucesso: true; idTransacaoExterna: string }
  | { sucesso: false; erro: string };

/** Ponto único de integração com quem manda o PIX de verdade. `mock` agora
 * (Fase 4); `stone` entra na Fase 5 quando houver credenciais/documentação
 * da API de pagamentos da Stone — trocável só mudando PAYMENT_PROVIDER. */
export interface PaymentService {
  enviarPagamento(dados: DadosPagamento): Promise<ResultadoPagamento>;
}
