import type { PaymentService, DadosPagamento, ResultadoPagamento } from "./payment-service";

/** Stub até termos credenciais/documentação da API de pagamentos da Stone
 * (Fase 5). As ferramentas Stone hoje conectadas neste ambiente são só
 * Open Finance somente-leitura — não enviam PIX; essa classe é o ponto de
 * integração com a API de pagamentos de verdade da Stone, ainda inexistente.
 *
 * IMPORTANTE — modelo de conta bem diferente da cobrança de mensalidade
 * (ver src/lib/cobranca/): pagar os extras não sai de uma conta única do
 * dono do iFREE, sai da conta Stone de CADA EMPRESA cliente (o dinheiro é
 * dela, não nosso). Isso não é uma API key simples que a empresa gera e
 * cola no sistema — o produto certo é o **Stone OpenBank**, que funciona
 * por consentimento estilo OAuth2 (mesma família do Open Finance):
 *   1. O iFREE precisa estar cadastrado como plataforma parceira na Stone
 *      OpenBank pra ganhar um client_id (passo comercial com a Stone,
 *      antes de qualquer código) — https://docs.openbank.stone.com.br
 *   2. A empresa cliente precisa já ter uma Conta de Pagamento Stone
 *      própria.
 *   3. Fluxo de conexão por empresa: redireciona pra tela de consentimento
 *      da Stone (link expira em 2h) → empresa escolhe a conta → Stone
 *      redireciona de volta com o resultado → webhook `consent_requested`
 *      avisa quando aprovado → só aí dá pra emitir token de acesso
 *      específico daquela empresa pra iniciar PIX em nome dela.
 * Ou seja: quando isso for implementado, `enviarPagamento` vai precisar
 * resolver qual token usar a partir da empresa do turno (`dados` precisa
 * carregar o empresaId), não de uma única credencial global — e vai
 * precisar de um novo model tipo `ConexaoStoneEmpresa` (token, resourceId,
 * status do consentimento) por empresa, além da tela de "Conectar minha
 * conta Stone" em /configuracoes e do webhook de consentimento. Nada disso
 * construído ainda — falta o cadastro do iFREE como plataforma primeiro. */
export class StonePaymentService implements PaymentService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida pela interface PaymentService
  async enviarPagamento(dados: DadosPagamento): Promise<ResultadoPagamento> {
    throw new Error(
      "StonePaymentService ainda não implementado — aguardando o iFREE virar plataforma parceira na Stone OpenBank (ver comentário da classe)."
    );
  }
}
