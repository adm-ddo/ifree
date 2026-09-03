import { randomBytes } from "node:crypto";
import type { CobrancaService, DadosCobranca, ResultadoCobranca } from "./cobranca-service";

/** Simula a geração de um PIX: pequeno atraso pra imitar rede real, sempre
 * sucesso, com um "copia-e-cola" reconhecível como fake — permite testar a
 * tela de /assinatura (gerar cobrança, marcar como paga direto no banco
 * simulando o webhook) sem precisar de credencial nenhuma da Pagar.me. */
export class MockCobrancaService implements CobrancaService {
  async criarCobrancaPix(dados: DadosCobranca): Promise<ResultadoCobranca> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const id = `mock_${randomBytes(8).toString("hex")}`;
    return {
      sucesso: true,
      idTransacaoExterna: id,
      qrCode: `00020126MOCKPIXNAOEUSAR-${id}-VALOR${dados.valor.toFixed(2)}-EMPRESA${dados.empresaId}`,
      qrCodeImagemUrl: null,
      expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
}
