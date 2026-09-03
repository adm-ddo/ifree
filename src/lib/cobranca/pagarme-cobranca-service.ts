import type { CobrancaService, DadosCobranca, ResultadoCobranca } from "./cobranca-service";

const PAGARME_API_URL = "https://api.pagar.me/core/v5";
const PIX_EXPIRA_EM_SEGUNDOS = 24 * 60 * 60;

type RespostaPedidoPagarme = {
  id: string;
  charges?: {
    id: string;
    last_transaction?: {
      qr_code?: string;
      qr_code_url?: string;
    };
  }[];
};

/** Integração real com a API de pedidos da Pagar.me (grupo Stone) — cria um
 * pedido com meio de pagamento Pix e devolve o copia-e-cola + QR code pra
 * mostrar na tela de /assinatura. Autenticação HTTP Basic com a secret key
 * como usuário e senha vazia (padrão da API v5 da Pagar.me).
 *
 * Escrito a partir da documentação pública da Pagar.me, mas ainda não
 * testado contra credencial de verdade — primeira coisa a validar assim
 * que houver uma PAGARME_API_KEY real (ver README/plano). Nunca lança:
 * qualquer erro de rede/resposta vira { sucesso: false }, mesmo espírito
 * de src/lib/pagamentos/stone-payment-service.ts. */
export class PagarmeCobrancaService implements CobrancaService {
  async criarCobrancaPix(dados: DadosCobranca): Promise<ResultadoCobranca> {
    const apiKey = process.env.PAGARME_API_KEY;
    if (!apiKey) {
      return { sucesso: false, erro: "PAGARME_API_KEY não configurada." };
    }

    try {
      const resposta = await fetch(`${PAGARME_API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        },
        body: JSON.stringify({
          items: [
            {
              amount: Math.round(dados.valor * 100),
              description: `Mensalidade iFREE — ${dados.referenciaMes}`,
              quantity: 1,
            },
          ],
          payments: [
            {
              payment_method: "pix",
              pix: { expires_in: PIX_EXPIRA_EM_SEGUNDOS },
            },
          ],
          metadata: { empresaId: String(dados.empresaId), referenciaMes: dados.referenciaMes },
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.text();
        return { sucesso: false, erro: `Pagar.me respondeu ${resposta.status}: ${corpo}` };
      }

      const pedido: RespostaPedidoPagarme = await resposta.json();
      const cobranca = pedido.charges?.[0];
      const qrCode = cobranca?.last_transaction?.qr_code;
      if (!cobranca || !qrCode) {
        return { sucesso: false, erro: "Resposta da Pagar.me sem QR code — verificar formato da API." };
      }

      return {
        sucesso: true,
        idTransacaoExterna: cobranca.id,
        qrCode,
        qrCodeImagemUrl: cobranca.last_transaction?.qr_code_url ?? null,
        expiraEm: new Date(Date.now() + PIX_EXPIRA_EM_SEGUNDOS * 1000),
      };
    } catch (err) {
      const erro = err instanceof Error ? err.message : "Erro desconhecido ao chamar a Pagar.me.";
      return { sucesso: false, erro };
    }
  }
}
