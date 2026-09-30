import { randomBytes } from "node:crypto";
import type { CobrancaSeloService, DadosCobrancaSelo, ResultadoCobrancaSelo } from "./cobranca-selo-service";

/** Simula a geração de um PIX pro selo do freelancer — mesmo comportamento
 * de src/lib/cobranca/mock-cobranca-service.ts: pequeno atraso, sempre
 * sucesso, "copia-e-cola" reconhecível como fake. Permite testar a tela de
 * /portal/selo sem precisar de credencial nenhuma da Asaas. */
export class MockCobrancaSeloService implements CobrancaSeloService {
  async criarCobrancaPix(dados: DadosCobrancaSelo): Promise<ResultadoCobrancaSelo> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const id = `mock_selo_${randomBytes(8).toString("hex")}`;
    return {
      sucesso: true,
      idTransacaoExterna: id,
      qrCode: `00020126MOCKPIXNAOEUSAR-${id}-VALOR${dados.valor.toFixed(2)}-PESSOA${dados.pessoaId}`,
      qrCodeImagemUrl: null,
      expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
}
