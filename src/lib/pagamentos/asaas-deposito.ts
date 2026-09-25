import "server-only";
import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/crypto";
import { diaSemanaISOBrasil, dataISOBrasil } from "@/lib/data";
import { enviarEmailSaldoBaixo, enviarEmailSaldoBaixoSextaFeira } from "@/lib/email";

function baseUrlAsaas(): string {
  return process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";
}

/// walletId da conta-mãe do iFREE — nunca muda, então cacheia em memória do
/// processo (evita uma chamada a mais na Asaas em todo depósito). Reseta
/// sozinho num cold start novo do servidor; custo de buscar de novo é
/// desprezível.
let walletIdContaMaeCache: string | null = null;

/** walletId de quem recebe a fatia do Split (ver splitPercentualAsaas em
 * Empresa) — busca ao vivo com a chave-mestra (não a da subconta) porque
 * não guardamos o walletId da própria conta-mãe em lugar nenhum. null
 * quando a chave-mestra não está configurada ou a consulta falha; nesse
 * caso o depósito segue SEM split (fail open — não faz sentido travar o
 * crédito da empresa por causa da nossa própria comissão). */
async function walletIdContaMae(): Promise<string | null> {
  if (walletIdContaMaeCache) return walletIdContaMaeCache;
  const apiKeyMestra = process.env.ASAAS_API_KEY;
  if (!apiKeyMestra) return null;
  try {
    // GET /myAccount NÃO retorna walletId (confirmado direto na API em
    // 2026-09-08 — era o bug: essa função sempre devolvia null, então
    // nenhum depósito até aqui aplicou o split configurado). O endpoint
    // certo pra pegar o walletId da própria conta é /wallets/, que devolve
    // uma lista paginada com o id em data[0].id.
    const resposta = await fetch(`${baseUrlAsaas()}/wallets/`, { headers: { access_token: apiKeyMestra } });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    walletIdContaMaeCache = typeof dados.data?.[0]?.id === "string" ? dados.data[0].id : null;
    return walletIdContaMaeCache;
  } catch {
    return null;
  }
}

/** Marca como EXPIRADO todo depósito PENDENTE cujo prazo do PIX
 * (expiraEm) já passou — sem isso, um PIX de depósito que a empresa não
 * paga a tempo fica PENDENTE pra sempre no banco (não existe webhook de
 * "PIX expirou" pra esse fluxo, diferente do de confirmação de
 * pagamento em src/app/api/webhooks/asaas/deposito/route.ts), e como
 * "Depósitos recentes" só mostra os 5 últimos (ver src/app/pagamentos/
 * page.tsx), ele simplesmente some da tela assim que outros depósitos
 * mais novos empurram ele pra fora da lista, sem nunca ter sido
 * corrigido. Chamada tanto ao vivo (na hora de montar a tela, escopada
 * na empresa — corrige na hora, sem esperar o cron) quanto pelo cron de
 * segurança (src/app/api/cron/verificar-pagamentos-asaas/route.ts, sem
 * empresaId — cobre quem não visita a tela de Pagamentos depois que o
 * PIX vence). empresaId omitido roda pra todo mundo de uma vez. */
export async function expirarDepositosVencidos(empresaId?: number): Promise<number> {
  const resultado = await prisma.depositoAsaas.updateMany({
    where: {
      status: "PENDENTE",
      expiraEm: { lt: new Date() },
      ...(empresaId !== undefined ? { empresaId } : {}),
    },
    data: { status: "EXPIRADO" },
  });
  return resultado.count;
}

export type ResultadoDeposito =
  | { sucesso: true; id: number; qrCode: string; qrCodeImagemUrl: string; expiraEm: Date }
  | { sucesso: false; erro: string };

/** Gera uma cobrança PIX avulsa que deposita direto na SUBCONTA da empresa
 * (o "crédito" usado depois pra pagar os extras — ver
 * src/lib/pagamentos/asaas-payment-service.ts) — mesmo espírito de
 * criarCobrancaPix em src/lib/cobranca/ (mensalidade do iFREE), só que o
 * dinheiro vai pra conta da empresa, não pra do iFREE, e quem "paga" é a
 * própria empresa pra si mesma (daí precisar de um Customer Asaas
 * representando ela mesma — criado uma vez, reaproveitado depois). */
export async function criarDepositoAsaas(empresaId: number, valor: number): Promise<ResultadoDeposito> {
  const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({ where: { empresaId } });
  if (!contaAsaas) return { sucesso: false, erro: "Essa empresa ainda não conectou uma conta de pagamento." };

  const apiKey = descriptografar(contaAsaas.apiKeyCriptografada);

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { nome: true, cnpj: true, splitPercentualAsaas: true },
  });

  let clienteId = contaAsaas.clienteProprioId;
  if (!clienteId) {
    const respostaCliente = await fetch(`${baseUrlAsaas()}/customers`, {
      method: "POST",
      headers: { access_token: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ name: empresa.nome, cpfCnpj: empresa.cnpj }),
    });
    const dadosCliente = await respostaCliente.json().catch(() => null);
    if (!respostaCliente.ok || !dadosCliente?.id) {
      return { sucesso: false, erro: dadosCliente?.errors?.[0]?.description ?? "Falha ao preparar o depósito." };
    }
    clienteId = dadosCliente.id;
    await prisma.contaAsaasEmpresa.update({ where: { empresaId }, data: { clienteProprioId: clienteId } });
  }

  // Split combinado individualmente com esta empresa (ver
  // splitPercentualAsaas em Empresa e atualizarAssinaturaEmpresa em
  // src/app/master/actions.ts) — a conta-mãe do iFREE recebe essa fatia
  // automaticamente no momento em que o depósito é pago, o resto cai
  // normalmente no saldo da subconta. Sem taxa combinada (null/0) ou sem
  // conseguir o walletId da conta-mãe, o depósito segue normal, sem split.
  const percentualSplit = empresa.splitPercentualAsaas !== null ? Number(empresa.splitPercentualAsaas) : 0;
  const walletId = percentualSplit > 0 ? await walletIdContaMae() : null;
  const split = walletId ? [{ walletId, percentualValue: percentualSplit }] : undefined;

  const hoje = new Date().toISOString().slice(0, 10);
  const respostaCobranca = await fetch(`${baseUrlAsaas()}/payments`, {
    method: "POST",
    headers: { access_token: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ customer: clienteId, billingType: "PIX", value: valor, dueDate: hoje, split }),
  });
  const dadosCobranca = await respostaCobranca.json().catch(() => null);
  if (!respostaCobranca.ok || !dadosCobranca?.id) {
    return { sucesso: false, erro: dadosCobranca?.errors?.[0]?.description ?? "Falha ao criar a cobrança PIX." };
  }

  // Uma tentativa (com uma retentativa curta) — observado na prática que o
  // QR code pode não estar pronto na hora exata em que a cobrança termina
  // de ser criada, mesmo o sandbox retornando 200 na criação (falha
  // transitória vista rodando este exato fluxo duas vezes seguidas: a
  // primeira falhou, a segunda — idêntica — funcionou. Nunca reproduzido
  // de outro jeito, então trata como instabilidade passageira da Asaas, não
  // como bug — uma segunda tentativa depois de 1,5s é suficiente pelo que
  // já vimos.
  async function buscarQrCode() {
    const resposta = await fetch(`${baseUrlAsaas()}/payments/${dadosCobranca.id}/pixQrCode`, {
      headers: { access_token: apiKey },
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

  // O sandbox da Asaas devolve `expirationDate` com 1 ANO de validade pro
  // PIX de teste (confirmado na prática: toda cobrança criada aqui veio
  // com expirationDate = data de criação + 1 ano, mesmo com dueDate
  // "hoje") — bem diferente do PIX de verdade em produção, que expira no
  // mesmo dia. Confiar cego nesse valor faz expirarDepositosVencidos()
  // nunca disparar de verdade (o depósito ficaria "Pendente" até 2027).
  // Por isso nunca aceita mais que 24h daqui, não importa o que a Asaas
  // mande — mesmo raciocínio de LIMITE_PROCESSANDO_HORAS em
  // src/lib/pagamentos/verificar-pendentes-asaas.ts (nunca confiar cego
  // num prazo que pode vir absurdo do provedor externo).
  const prazoMaximo = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiraEmAsaas = dadosQr.expirationDate ? new Date(dadosQr.expirationDate) : null;
  const expiraEm = expiraEmAsaas && expiraEmAsaas < prazoMaximo ? expiraEmAsaas : prazoMaximo;
  const qrCodeImagemUrl = `data:image/png;base64,${dadosQr.encodedImage}`;

  const deposito = await prisma.depositoAsaas.create({
    data: {
      empresaId,
      valor,
      idCobrancaExterna: dadosCobranca.id,
      qrCode: dadosQr.payload,
      qrCodeImagemUrl,
      expiraEm,
    },
  });

  return { sucesso: true, id: deposito.id, qrCode: dadosQr.payload, qrCodeImagemUrl, expiraEm };
}

/** Saldo disponível AGORA na subconta — consulta ao vivo na Asaas
 * (`GET /v3/finance/balance`), não um valor guardado no nosso banco (o
 * dinheiro pode mudar por fora, ex.: um PIX enviado que ainda não
 * refletimos). null quando a empresa não tem conta conectada ou a
 * consulta falha (rede, chave inválida etc.) — tratado como "não sei",
 * nunca como zero. */
export async function buscarSaldoAsaas(empresaId: number): Promise<number | null> {
  const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({ where: { empresaId } });
  if (!contaAsaas) return null;

  try {
    const apiKey = descriptografar(contaAsaas.apiKeyCriptografada);
    const resposta = await fetch(`${baseUrlAsaas()}/finance/balance`, { headers: { access_token: apiKey } });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    return typeof dados.balance === "number" ? dados.balance : null;
  } catch {
    return null;
  }
}

/** Mesma consulta de buscarSaldoAsaas, mas pra várias empresas de uma vez
 * (usado pelo dashboard de clientes em /master/assinaturas) — uma query só
 * pra achar todas as contas conectadas, depois uma chamada em paralelo por
 * conta. Duplica o miolo de buscarSaldoAsaas em vez de fazer essa
 * reaproveitar esta (ou vice-versa) de propósito: aquela função é usada em
 * 4 telas de fluxo de dinheiro ao vivo (dashboard, pagamentos), não vale o
 * risco de mexer nela só pra virar genérica.
 *
 * `Promise.allSettled` (não `Promise.all`) — uma conta com chave inválida
 * ou fora do ar não pode apagar o saldo das outras. Timeout de 5s por
 * chamada: como todas rodam em paralelo, o tempo total da função fica
 * limitado a isso, não a N vezes o tempo de resposta da Asaas.
 *
 * Resultado: empresa AUSENTE do Map = não tem conta Asaas conectada;
 * presente com `null` = tem conta, mas a consulta falhou agora (chave
 * inválida, rede, timeout) — nunca vira 0, mesmo espírito de
 * buscarSaldoAsaas (0 real é diferente de "não sei"). */
export async function buscarSaldosAsaas(empresaIds: number[]): Promise<Map<number, number | null>> {
  const contas = await prisma.contaAsaasEmpresa.findMany({
    where: { empresaId: { in: empresaIds } },
    select: { empresaId: true, apiKeyCriptografada: true },
  });

  const resultado = new Map<number, number | null>();
  await Promise.allSettled(
    contas.map(async (conta) => {
      try {
        const apiKey = descriptografar(conta.apiKeyCriptografada);
        const resposta = await fetch(`${baseUrlAsaas()}/finance/balance`, {
          headers: { access_token: apiKey },
          signal: AbortSignal.timeout(5000),
        });
        if (!resposta.ok) {
          resultado.set(conta.empresaId, null);
          return;
        }
        const dados = await resposta.json();
        resultado.set(conta.empresaId, typeof dados.balance === "number" ? dados.balance : null);
      } catch {
        resultado.set(conta.empresaId, null);
      }
    })
  );
  return resultado;
}

/** Roda no cron /api/cron/verificar-saldo-baixo (2x/dia) — pra toda
 * empresa com alertaSaldoBaixoAtivo, compara o saldo ao vivo
 * (buscarSaldosAsaas) contra alertaSaldoBaixoValorMinimo e avisa por
 * e-mail quando cair abaixo.
 *
 * Sexta-feira tem prioridade: se o saldo está baixo E hoje é sexta (ver
 * diaSemanaISOBrasil), manda a versão com clima de fim de semana em vez
 * da genérica — nunca as duas juntas no mesmo dia. Decisão do Thiago em
 * 2026-09-25: o aviso de sexta só dispara junto com a mesma condição do
 * aviso normal (saldo baixo), nunca como lembrete preventivo pra quem
 * está com saldo tranquilo.
 *
 * Dedupe: alertaSaldoBaixoNotificadoEm (genérico) fica marcado enquanto o
 * saldo continuar baixo — não reenvia a cada rodada do cron — e zera
 * sozinho assim que o saldo volta pra cima do mínimo, pronto pra avisar
 * de novo na próxima queda. alertaSaldoBaixoSextaNotificadoEm é comparado
 * só pela DATA (dataISOBrasil): evita duplicar entre as duas rodadas do
 * mesmo dia, mas permite avisar de novo na sexta seguinte se o saldo
 * continuar baixo (por isso nunca reseta com a recuperação do saldo). */
export async function verificarAlertasSaldoBaixo(): Promise<{
  notificadas: number;
  sextaNotificadas: number;
}> {
  const empresas = await prisma.empresa.findMany({
    where: { alertaSaldoBaixoAtivo: true, alertaSaldoBaixoValorMinimo: { not: null } },
    select: {
      id: true,
      nome: true,
      alertaSaldoBaixoValorMinimo: true,
      alertaSaldoBaixoNotificadoEm: true,
      alertaSaldoBaixoSextaNotificadoEm: true,
      usuarios: { select: { usuario: { select: { email: true } } } },
    },
  });
  if (empresas.length === 0) return { notificadas: 0, sextaNotificadas: 0 };

  const saldos = await buscarSaldosAsaas(empresas.map((e) => e.id));
  const hoje = new Date();
  const ehSexta = diaSemanaISOBrasil(hoje) === 5;
  const hojeISO = dataISOBrasil(hoje);

  let notificadas = 0;
  let sextaNotificadas = 0;
  for (const empresa of empresas) {
    const saldo = saldos.get(empresa.id);
    if (saldo === undefined || saldo === null) continue; // sem conta ou consulta falhou — não dá pra saber

    const minimo = Number(empresa.alertaSaldoBaixoValorMinimo);
    if (saldo >= minimo) {
      if (empresa.alertaSaldoBaixoNotificadoEm) {
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { alertaSaldoBaixoNotificadoEm: null },
        });
      }
      continue;
    }

    if (ehSexta) {
      const jaAvisadoHoje =
        empresa.alertaSaldoBaixoSextaNotificadoEm &&
        dataISOBrasil(empresa.alertaSaldoBaixoSextaNotificadoEm) === hojeISO;
      if (!jaAvisadoHoje) {
        for (const { usuario } of empresa.usuarios) {
          await enviarEmailSaldoBaixoSextaFeira(usuario.email, empresa.nome, saldo, minimo);
        }
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { alertaSaldoBaixoSextaNotificadoEm: hoje },
        });
        sextaNotificadas++;
      }
      continue; // sexta nunca manda o genérico junto, mesmo se já avisado hoje
    }

    if (!empresa.alertaSaldoBaixoNotificadoEm) {
      for (const { usuario } of empresa.usuarios) {
        await enviarEmailSaldoBaixo(usuario.email, empresa.nome, saldo, minimo);
      }
      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { alertaSaldoBaixoNotificadoEm: hoje },
      });
      notificadas++;
    }
  }
  return { notificadas, sextaNotificadas };
}
