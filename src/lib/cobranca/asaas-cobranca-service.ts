import { prisma } from "@/lib/prisma";
import type { CobrancaService, DadosCobranca, ResultadoCobranca } from "./cobranca-service";

function baseUrlAsaas(): string {
  return process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";
}

/** Cobra a mensalidade do iFREE via Pix pela CONTA-MÃE da Asaas (chave
 * mestra, ASAAS_API_KEY) — mesma conta já validada em produção pra pagar
 * os extras (ver src/lib/pagamentos/asaas-payment-service.ts), mas aqui o
 * dinheiro entra pro iFREE em vez de sair. Cada empresa cliente vira um
 * Customer dentro da conta-mãe (Empresa.clienteAsaasMensalidadeId — NÃO
 * confundir com ContaAsaasEmpresa.clienteProprioId, que é outra conta
 * inteiramente diferente, a subconta da própria empresa). Confirmação de
 * pagamento chega pelo webhook em
 * src/app/api/webhooks/asaas/mensalidade/route.ts. */
export class AsaasCobrancaService implements CobrancaService {
  async criarCobrancaPix(dados: DadosCobranca): Promise<ResultadoCobranca> {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) return { sucesso: false, erro: "Integração com a Asaas ainda não configurada no ambiente." };

    try {
      const empresa = await prisma.empresa.findUniqueOrThrow({
        where: { id: dados.empresaId },
        select: { nome: true, cnpj: true, clienteAsaasMensalidadeId: true },
      });

      let clienteId = empresa.clienteAsaasMensalidadeId;
      if (!clienteId) {
        const respostaCliente = await fetch(`${baseUrlAsaas()}/customers`, {
          method: "POST",
          headers: { access_token: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ name: empresa.nome, cpfCnpj: empresa.cnpj }),
        });
        const dadosCliente = await respostaCliente.json().catch(() => null);
        if (!respostaCliente.ok || !dadosCliente?.id) {
          return { sucesso: false, erro: dadosCliente?.errors?.[0]?.description ?? "Falha ao preparar a cobrança." };
        }
        clienteId = dadosCliente.id;
        await prisma.empresa.update({
          where: { id: dados.empresaId },
          data: { clienteAsaasMensalidadeId: clienteId },
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
          description: `Mensalidade iFREE — ${dados.referenciaMes}`,
          externalReference: dados.referenciaMes,
        }),
      });
      const dadosCobranca = await respostaCobranca.json().catch(() => null);
      if (!respostaCobranca.ok || !dadosCobranca?.id) {
        return { sucesso: false, erro: dadosCobranca?.errors?.[0]?.description ?? "Falha ao criar a cobrança PIX." };
      }

      // Mesma instabilidade transitória já observada no depósito de crédito
      // dos extras (ver criarDepositoAsaas em
      // src/lib/pagamentos/asaas-deposito.ts) — uma retentativa curta basta.
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
