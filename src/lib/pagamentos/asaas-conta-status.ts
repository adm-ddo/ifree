import "server-only";
import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/crypto";
import { enviarEmailContaAsaasAprovada } from "@/lib/email";

function baseUrlAsaas(): string {
  return process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";
}

export type StatusAsaasLive = {
  /// Status bruto devolvido pela Asaas em GET /myAccount (ex.: "PENDING",
  /// "APPROVED", "AWAITING_APPROVAL", "REPROVED") — diferente do nosso
  /// StatusContaAsaas (que só existe pra exibição inicial e nunca é
  /// atualizado automaticamente, já que não há webhook de status de conta).
  statusConta: string;
  pixLiberado: boolean;
};

/** Consulta ao vivo (GET /myAccount + GET /myAccount/documents) se a
 * subconta já pode operar Pix de verdade — a aprovação geral da conta
 * (`status: "APPROVED"`) NÃO é suficiente, a Asaas exige separadamente que
 * os documentos de identificação (IDENTIFICATION + IDENTIFICATION_SELFIE)
 * estejam todos APPROVED (confirmado testando a DB25 em produção,
 * 2026-09-07: conta com status APPROVED ainda recusava Pix até os dois
 * documentos serem aprovados). Sem documentos pendentes cadastrados
 * (array vazio) também conta como liberado — acontece com tipos de conta
 * que não exigem essa verificação extra.
 *
 * Persiste o resultado em ContaAsaasEmpresa (status/pixLiberado) — não há
 * webhook da Asaas pra aprovação/liberação de Pix, então o valor salvo só
 * atualiza quando esta função roda de novo (ao abrir /configuracoes ou
 * /pagamentos). null quando a empresa não tem conta conectada ou a
 * consulta falha (rede, chave inválida etc.) — nesse caso o valor salvo no
 * banco não é tocado; quem chama já sabe cair pro campo persistido nesse
 * caso (ver ContaAsaasForm.tsx).
 *
 * Uma vez com status ATIVA e pixLiberado true, não há mais nada de útil
 * pra detectar reconsultando: virar BLOQUEADA depois disso É coberto por
 * webhook de verdade (ver enum StatusContaAsaas no schema), diferente da
 * aprovação inicial. Sem esse corte, toda visita a /pagamentos ou
 * /configuracoes disparava 2 chamadas de rede à Asaas (GET /myAccount +
 * GET /myAccount/documents) — e como /pagamentos tem AutoRefresh de 5s,
 * isso repetia sem parar enquanto a tela ficasse aberta. Era o gargalo real
 * por trás da demora sentida ao trocar de tela pra pagamentos (reportado
 * pelo Thiago 2026-09-19), não falta de índice nem query pesada. */
export async function verificarStatusAsaas(empresaId: number): Promise<StatusAsaasLive | null> {
  const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({ where: { empresaId } });
  if (!contaAsaas) return null;
  if (contaAsaas.status === "ATIVA" && contaAsaas.pixLiberado) return null;

  try {
    const apiKey = descriptografar(contaAsaas.apiKeyCriptografada);

    const respConta = await fetch(`${baseUrlAsaas()}/myAccount`, { headers: { access_token: apiKey } });
    if (!respConta.ok) return null;
    const dadosConta = await respConta.json();
    const statusConta: string = dadosConta.status;

    const respDocs = await fetch(`${baseUrlAsaas()}/myAccount/documents`, { headers: { access_token: apiKey } });
    const dadosDocs = respDocs.ok ? await respDocs.json() : null;
    const documentos: { status: string }[] = dadosDocs?.data ?? [];
    const pixLiberado = documentos.every((d) => d.status === "APPROVED");

    await prisma.contaAsaasEmpresa.update({
      where: { empresaId },
      data: {
        status: statusConta === "APPROVED" ? "ATIVA" : statusConta === "REPROVED" ? "BLOQUEADA" : "PENDENTE_ATIVACAO",
        pixLiberado,
      },
    });

    return { statusConta, pixLiberado };
  } catch {
    return null;
  }
}

/** Roda no cron /api/cron/verificar-aprovacoes-asaas (a cada 3h) — chama
 * verificarStatusAsaas pra toda empresa ainda PENDENTE_ATIVACAO e avisa
 * por e-mail quem acabou de ser aprovado de verdade (status ATIVA E
 * pixLiberado, o ponto em que dá pra pagar extra de verdade). Sem isso, a
 * única forma de descobrir a aprovação era alguém abrir /configuracoes ou
 * /pagamentos de novo — não existe webhook da Asaas pra isso (ver
 * comentário de verificarStatusAsaas acima).
 *
 * aprovacaoNotificadaEm (ContaAsaasEmpresa) garante que o e-mail só sai
 * uma vez — sem essa marcação, toda rodada do cron reenviaria pra quem já
 * foi avisado antes. Avisa TODO usuário com acesso à empresa (não só quem
 * conectou a conta), porque o cadastro na Asaas guarda só o e-mail de
 * contato digitado na hora, que nem chega a ser salvo em
 * ContaAsaasEmpresa. */
export async function verificarAprovacoesAsaasPendentes(): Promise<{ notificadas: number }> {
  const pendentes = await prisma.contaAsaasEmpresa.findMany({
    where: { status: "PENDENTE_ATIVACAO", desconectadoEm: null, aprovacaoNotificadaEm: null },
    select: {
      empresaId: true,
      empresa: {
        select: {
          nome: true,
          usuarios: { select: { usuario: { select: { email: true } } } },
        },
      },
    },
  });

  let notificadas = 0;
  for (const conta of pendentes) {
    const statusAgora = await verificarStatusAsaas(conta.empresaId);
    if (statusAgora?.statusConta !== "APPROVED" || !statusAgora.pixLiberado) continue;

    for (const { usuario } of conta.empresa.usuarios) {
      await enviarEmailContaAsaasAprovada(usuario.email, conta.empresa.nome);
    }
    await prisma.contaAsaasEmpresa.update({
      where: { empresaId: conta.empresaId },
      data: { aprovacaoNotificadaEm: new Date() },
    });
    notificadas++;
  }
  return { notificadas };
}
