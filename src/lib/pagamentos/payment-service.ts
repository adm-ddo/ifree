import type { TipoChavePix } from "@/generated/prisma/enums";

export type DadosPagamento = {
  turnoId: number;
  empresaId: number;
  valor: number;
  chavePixDestino: string;
  tipoChavePixDestino: TipoChavePix;
};

export type ResultadoPagamento =
  /// `final: true` = o provedor já resolveu tudo nessa mesma chamada
  /// (mock: sempre; nenhum provedor real de verdade é síncrono assim) —
  /// processarPagamentoTurno pode marcar o Turno como PAGO na hora.
  /// `final: false` = só foi ACEITO pra processar (ex.: Asaas, que devolve
  /// status "PENDING" e confirma de verdade depois por webhook — ver
  /// src/app/api/webhooks/asaas/transferencia/route.ts) — Pagamento fica
  /// em PROCESSANDO, Turno não muda ainda, até o webhook (ou o cron de
  /// conferência, rede de segurança pro webhook que não chegar) resolver.
  | { sucesso: true; idTransacaoExterna: string; final: boolean }
  | { sucesso: false; erro: string };

/** Ponto único de integração com quem manda o PIX de verdade. `mock` é o
 * padrão hoje; `stone` e `asaas` são candidatos a provedor real (ver
 * stone-payment-service.ts e asaas-payment-service.ts — nenhum dos dois
 * implementado ainda) — trocável só mudando PAYMENT_PROVIDER. `empresaId`
 * existe em DadosPagamento porque o dinheiro sai da conta de CADA empresa
 * cliente, não de uma credencial única do iFREE — qualquer provedor real
 * precisa resolver qual credencial/subconta usar a partir dele. */
export interface PaymentService {
  enviarPagamento(dados: DadosPagamento): Promise<ResultadoPagamento>;
}
