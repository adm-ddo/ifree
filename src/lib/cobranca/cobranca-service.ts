export type DadosCobranca = {
  empresaId: number;
  valor: number;
  referenciaMes: string;
};

export type ResultadoCobranca =
  | {
      sucesso: true;
      idTransacaoExterna: string;
      qrCode: string;
      qrCodeImagemUrl: string | null;
      expiraEm: Date;
    }
  | { sucesso: false; erro: string };

/** Ponto único de integração com quem gera o PIX de verdade pra cobrar a
 * mensalidade — mesmo espírito de src/lib/pagamentos/payment-service.ts
 * (envio de PIX pros extras), só que essa aqui é entrada de dinheiro
 * (mensalidade), não saída. `mock` funciona sem credencial nenhuma;
 * `pagarme` entra quando houver a API key da Pagar.me — trocável só
 * mudando COBRANCA_PROVIDER. */
export interface CobrancaService {
  criarCobrancaPix(dados: DadosCobranca): Promise<ResultadoCobranca>;
}
