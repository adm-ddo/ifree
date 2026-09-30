import { prisma } from "@/lib/prisma";
import type { CobrancaSeloService, DadosCobrancaSelo, ResultadoCobrancaSelo } from "./cobranca-selo-service";

function baseUrlAsaas(): string {
  return process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";
}

/** Cobra o selo do freelancer via Pix pela mesma CONTA-MÃE da Asaas usada
 * pra mensalidade da empresa (ASAAS_API_KEY, ver
 * src/lib/cobranca/asaas-cobranca-service.ts) — cada freelancer vira um
 * Customer dentro da conta-mãe (Pessoa.clienteAsaasSeloId). Confirmação de
 * pagamento chega pelo MESMO webhook da mensalidade
 * (src/app/api/webhooks/asaas/mensalidade/route.ts), que tenta confirmar
 * como empresa primeiro e cai pra confirmarCobrancaSeloPaga se não achar —
 * não precisa de webhook nem token novos. */
export class AsaasCobrancaSeloService implements CobrancaSeloService {
  async criarCobrancaPix(dados: DadosCobrancaSelo): Promise<ResultadoCobrancaSelo> {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) return { sucesso: false, erro: "Integração com a Asaas ainda não configurada no ambiente." };

    try {
      const pessoa = await prisma.pessoa.findUniqueOrThrow({
        where: { id: dados.pessoaId },
        select: { nome: true, documento: true, clienteAsaasSeloId: true },
      });

      let clienteId = pessoa.clienteAsaasSeloId;
      if (!clienteId) {
        const respostaCliente = await fetch(`${baseUrlAsaas()}/customers`, {
          method: "POST",
          headers: { access_token: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ name: pessoa.nome, cpfCnpj: pessoa.documento }),
        });
        const dadosCliente = await respostaCliente.json().catch(() => null);
        if (!respostaCliente.ok || !dadosCliente?.id) {
          return { sucesso: false, erro: dadosCliente?.errors?.[0]?.description ?? "Falha ao preparar a cobrança." };
        }
        clienteId = dadosCliente.id;
        await prisma.pessoa.update({
          where: { id: dados.pessoaId },
          data: { clienteAsaasSeloId: clienteId },
        });
      }

      const hoje = new Date().toISOString().slice(0, 10);
      const respostaCobranca = await fetch(`${baseUrlAsaas()}/payments`, {
        method: "POST",
        headers: { access_token: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: clienteId,
          billingType: "PIX",
          value: dados.valor,
          dueDate: hoje,
          description: `Selo ${dados.selo} iFREE Conecta — ${dados.referenciaMes}`,
          externalReference: dados.referenciaMes,
        }),
      });
      const dadosCobranca = await respostaCobranca.json().catch(() => null);
      if (!respostaCobranca.ok || !dadosCobranca?.id) {
        return { sucesso: false, erro: dadosCobranca?.errors?.[0]?.description ?? "Falha ao criar a cobrança PIX." };
      }

      // Mesma instabilidade transitória já observada nos outros PIX (ver
      // AsaasCobrancaService) — uma retentativa curta basta.
      async function buscarQrCode() {
        const resposta = await fetch(`${baseUrlAsaas()}/payments/${dadosCobranca.id}/pixQrCode`, {
          headers: { access_token: apiKey! },
        });
        const dados = await resposta.json().catch(() => null);
        return resposta.ok && dados?.payload ? dados : null;
      }
      let dadosQr = await buscarQrCode();
      if (!dadosQr) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        dadosQr = await buscarQrCode();
      }
      if (!dadosQr) {
        return { sucesso: false, erro: "Cobrança criada, mas não consegui gerar o QR code — tenta de novo." };
      }

      const expiraEm = dadosQr.expirationDate
        ? new Date(dadosQr.expirationDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      return {
        sucesso: true,
        idTransacaoExterna: dadosCobranca.id,
        qrCode: dadosQr.payload,
        qrCodeImagemUrl: `data:image/png;base64,${dadosQr.encodedImage}`,
        expiraEm,
      };
    } catch (err) {
      const erro = err instanceof Error ? err.message : "Erro desconhecido ao chamar a Asaas.";
      return { sucesso: false, erro };
    }
  }
}
