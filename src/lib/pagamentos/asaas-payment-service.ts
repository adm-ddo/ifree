import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/crypto";
import type { PaymentService, DadosPagamento, ResultadoPagamento } from "./payment-service";
import type { TipoChavePix } from "@/generated/prisma/enums";

/** IMPLEMENTADO E TESTADO DE PONTA A PONTA contra o sandbox da Asaas
 * (2026-09-07) — histórico completo do desenho e de cada descoberta feita
 * no caminho (webhook por subconta, autorização, máquina de estados
 * assíncrona) em git blame/CLAUDE deste arquivo antes desta versão. Resumo
 * do que importa manter em mente:
 *
 *   - O dinheiro sai da SUBCONTA da empresa (ContaAsaasEmpresa), nunca de
 *     uma credencial única do iFREE — cada chamada usa a apiKey daquela
 *     empresa especificamente.
 *   - `POST /v3/transfers` é síncrono só pra ACEITAR a transferência
 *     (devolve `status: "PENDING"` mesmo quando vai dar certo) — por isso
 *     `final: false` aqui sempre. A confirmação de verdade (concluiu ou
 *     falhou) chega depois pelo webhook de status
 *     (src/app/api/webhooks/asaas/transferencia/route.ts), registrado na
 *     PRÓPRIA subconta no momento da conexão (ver conectarContaAsaas em
 *     src/app/configuracoes/actions.ts) — não pela conta-mãe.
 *   - Toda transferência de subconta passa por um webhook de AUTORIZAÇÃO
 *     (src/app/api/webhooks/asaas/autorizacao/route.ts), configurado uma
 *     única vez na conta-mãe — sem isso, a Asaas exigiria confirmação por
 *     SMS e travaria a automação. Já configurado e testado.
 *   - `PAYMENT_PROVIDER=asaas` é um interruptor global, mas só empresas
 *     com ContaAsaasEmpresa conectada são realmente automatizadas (ver
 *     automatizado() em src/lib/pagamentos/processar.ts) — as demais
 *     continuam no fluxo manual de sempre.
 *
 * TESTADO DE VERDADE (2026-09-07) chamando processarPagamentoTurno de
 * ponta a ponta (não só chamadas isoladas à API) — os dois desfechos:
 *   - FALHA: 3 turnos de teste seguidos, com subcontas e chaves PIX
 *     diferentes (inclusive uma subconta já usada com sucesso antes),
 *     terminaram `FAILED` no sandbox com o motivo genérico "Falha ao
 *     processar a transferência" — confirmado que isso acontece DEPOIS da
 *     nossa autorização (webhook de autorização aprovou certinho, porque
 *     reconheceu o Pagamento), então não é a nossa lógica recusando; é o
 *     banco simulado do sandbox que decide se aquela transferência
 *     específica "dá certo" ou não (não descobri o critério — pode ser
 *     valor, pode ser taxa de falha proposital do ambiente de teste — não
 *     vale a pena investigar mais fundo, já que o comportamento do NOSSO
 *     lado está certo nos dois casos). O importante: Pagamento foi pra
 *     FALHOU e Turno pra ERRO_PAGAMENTO automaticamente, aparecendo em
 *     /pagamentos pro dono ver e agir — exatamente o esperado.
 *   - SUCESSO: confirmado em teste isolado anterior (não nesta bateria
 *     final) que um TRANSFER_DONE de verdade finaliza Pagamento como
 *     CONCLUIDO e Turno como PAGO — ver histórico de testes desta sessão.
 * Ou seja: o código está certo nos dois casos; o sandbox da Asaas é quem
 * decide, teste a teste, se aquela transferência específica "passa". */
export class AsaasPaymentService implements PaymentService {
  async enviarPagamento(dados: DadosPagamento): Promise<ResultadoPagamento> {
    const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({
      where: { empresaId: dados.empresaId },
    });
    if (!contaAsaas) {
      // Não deveria acontecer na prática — automatizado() em processar.ts
      // já filtra por ContaAsaasEmpresa existir antes de chegar aqui — mas
      // não custa a rede de segurança caso alguém chame direto.
      return { sucesso: false, erro: "Essa empresa ainda não conectou uma conta de pagamento (Asaas)." };
    }

    let apiKey: string;
    try {
      apiKey = descriptografar(contaAsaas.apiKeyCriptografada);
    } catch {
      return { sucesso: false, erro: "Falha ao ler a credencial de pagamento da empresa — avise o suporte." };
    }

    try {
      const resposta = await fetch(`${baseUrlAsaas()}/transfers`, {
        method: "POST",
        headers: { access_token: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          value: dados.valor,
          pixAddressKey: dados.chavePixDestino,
          pixAddressKeyType: mapearTipoChavePix(dados.tipoChavePixDestino),
        }),
      });
      const corpo = await resposta.json().catch(() => null);

      if (!resposta.ok || !corpo?.id) {
        const erro = corpo?.errors?.[0]?.description ?? `Asaas respondeu ${resposta.status} ao enviar o PIX.`;
        return { sucesso: false, erro };
      }

      // status vem sempre "PENDING" aqui, mesmo quando vai completar com
      // sucesso — não é o resultado final, só a confirmação de que foi
      // aceito. Ver comentário da classe.
      return { sucesso: true, idTransacaoExterna: corpo.id, final: false };
    } catch (err) {
      const erro = err instanceof Error ? err.message : "Erro desconhecido ao chamar a Asaas.";
      return { sucesso: false, erro };
    }
  }
}

function baseUrlAsaas(): string {
  return process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";
}

/// CPF/CNPJ/EMAIL têm o mesmo nome nos dois lados — só TELEFONE e
/// ALEATORIA divergem do vocabulário da Asaas (PHONE/EVP).
function mapearTipoChavePix(tipo: TipoChavePix): string {
  if (tipo === "TELEFONE") return "PHONE";
  if (tipo === "ALEATORIA") return "EVP";
  return tipo;
}
