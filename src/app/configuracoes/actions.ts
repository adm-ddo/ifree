"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { revalidatePath } from "next/cache";
import { textoParaTermos } from "@/lib/termos";
import { paraMinutosHorario } from "@/lib/ponto";
import { criptografar } from "@/lib/crypto";
import { AVISO_VENCIMENTO_OPCOES } from "@/lib/assinatura";
import { lerDadosEmpresa } from "@/lib/empresa";
import { verificarSenha } from "@/lib/auth";

/** Confirma a senha de quem está logado antes de criar/trocar a chave de
 * API da conta de pagamento (conectarContaAsaas/Existente,
 * atualizarChaveAsaas) — é o vetor real de fraude aqui: uma sessão
 * comprometida (cookie roubado, dispositivo destravado) trocando a chave
 * redireciona todo pagamento automático futuro pra uma conta de outra
 * pessoa. Mesmo padrão de trocarSenha (src/app/meus-dados/actions.ts).
 * Decisão do Thiago em 2026-09-22. */
async function confirmarSenhaOuErro(usuarioId: number, senhaDigitada: string): Promise<string | null> {
  if (!senhaDigitada) return "Confirme sua senha pra continuar.";
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  if (!(await verificarSenha(senhaDigitada, usuario.senhaHash))) return "Senha incorreta.";
  return null;
}

export type ConfiguracoesState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarConfiguracoes(
  _prev: ConfiguracoesState,
  formData: FormData
): Promise<ConfiguracoesState> {
  const sessao = await requireModulo("configuracoes");

  const resultado = lerDadosEmpresa(formData);
  if ("erro" in resultado) return resultado;

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: resultado.dados,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  revalidatePath("/", "layout");
  return { sucesso: true };
}

export type SlaEticaState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarSlaEtica(
  _prev: SlaEticaState,
  formData: FormData
): Promise<SlaEticaState> {
  const sessao = await requireModulo("configuracoes");

  const dias = Number(formData.get("slaDenunciaDias"));
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    return { erro: "Informe um número de dias entre 1 e 365." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { slaDenunciaDias: dias },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type AvisoVencimentoState = { erro?: string; sucesso?: boolean } | undefined;

/** Com quantos dias de antecedência o dono da empresa quer ver o aviso de
 * renovação (AlertaAssinaturaVencendo, ver src/app/layout.tsx) — escolha
 * dele, não do master. Só aceita os valores de AVISO_VENCIMENTO_OPCOES. */
export async function atualizarAvisoVencimento(
  _prev: AvisoVencimentoState,
  formData: FormData
): Promise<AvisoVencimentoState> {
  const sessao = await requireModulo("configuracoes");

  const dias = Number(formData.get("avisoVencimentoDias"));
  if (!AVISO_VENCIMENTO_OPCOES.includes(dias as (typeof AVISO_VENCIMENTO_OPCOES)[number])) {
    return { erro: "Selecione uma opção válida." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { avisoVencimentoDias: dias },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  revalidatePath("/", "layout");
  return { sucesso: true };
}

export type TermosState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarTermosContrato(
  _prev: TermosState,
  formData: FormData
): Promise<TermosState> {
  const sessao = await requireModulo("configuracoes");

  const texto = String(formData.get("termos") ?? "").trim();
  if (textoParaTermos(texto).length === 0) {
    return { erro: "Escreva pelo menos um parágrafo de termo." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { termosContrato: texto },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

/** Apaga o texto personalizado e volta a usar o padrão do sistema. */
export async function restaurarTermosPadrao(): Promise<TermosState> {
  const sessao = await requireModulo("configuracoes");

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { termosContrato: null },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type PausaState = { erro?: string; sucesso?: boolean } | undefined;

const MODOS_PAUSA_VALIDOS = ["NENHUMA", "AUTOMATICA_30", "AUTOMATICA_60"] as const;

export async function atualizarModoPausa(
  _prev: PausaState,
  formData: FormData
): Promise<PausaState> {
  const sessao = await requireModulo("configuracoes");

  const modoPausaDia = String(formData.get("modoPausaDia") ?? "");
  const modoPausaNoite = String(formData.get("modoPausaNoite") ?? "");
  if (
    !MODOS_PAUSA_VALIDOS.includes(modoPausaDia as (typeof MODOS_PAUSA_VALIDOS)[number]) ||
    !MODOS_PAUSA_VALIDOS.includes(modoPausaNoite as (typeof MODOS_PAUSA_VALIDOS)[number])
  ) {
    return { erro: "Selecione uma opção válida." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      modoPausaDia: modoPausaDia as (typeof MODOS_PAUSA_VALIDOS)[number],
      modoPausaNoite: modoPausaNoite as (typeof MODOS_PAUSA_VALIDOS)[number],
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type IntervaloCltState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarIntervaloClt(
  _prev: IntervaloCltState,
  formData: FormData
): Promise<IntervaloCltState> {
  const sessao = await requireModulo("configuracoes");

  const funcionariosBaterIntervalo = formData.get("funcionariosBaterIntervalo") === "on";
  const modoPausaCltDia = String(formData.get("modoPausaCltDia") ?? "");
  const modoPausaCltNoite = String(formData.get("modoPausaCltNoite") ?? "");
  if (
    !MODOS_PAUSA_VALIDOS.includes(modoPausaCltDia as (typeof MODOS_PAUSA_VALIDOS)[number]) ||
    !MODOS_PAUSA_VALIDOS.includes(modoPausaCltNoite as (typeof MODOS_PAUSA_VALIDOS)[number])
  ) {
    return { erro: "Selecione uma opção válida." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      funcionariosBaterIntervalo,
      modoPausaCltDia: modoPausaCltDia as (typeof MODOS_PAUSA_VALIDOS)[number],
      modoPausaCltNoite: modoPausaCltNoite as (typeof MODOS_PAUSA_VALIDOS)[number],
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type DiariaState = { erro?: string; sucesso?: boolean } | undefined;

/** Faixas em horas (convertidas pra minutos, unidade usada no banco) que
 * definem quanto da diária um freelancer em modo DIARIA recebe. */
export async function atualizarLimiaresDiaria(
  _prev: DiariaState,
  formData: FormData
): Promise<DiariaState> {
  const sessao = await requireModulo("configuracoes");

  const horasMeia = Number(String(formData.get("limiarMeiaHoras") ?? "").replace(",", "."));
  const horasCompleta = Number(
    String(formData.get("limiarCompletaHoras") ?? "").replace(",", ".")
  );

  if (!Number.isFinite(horasMeia) || horasMeia <= 0) {
    return { erro: "Informe um número de horas válido pra faixa de meia diária." };
  }
  if (!Number.isFinite(horasCompleta) || horasCompleta <= horasMeia) {
    return { erro: "A faixa de diária completa precisa ser maior que a de meia diária." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      diariaLimiarMeiaMin: Math.round(horasMeia * 60),
      diariaLimiarCompletaMin: Math.round(horasCompleta * 60),
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type HorarioFechamentoState = { erro?: string; sucesso?: boolean } | undefined;

/** Início e fim de cada turno (dia/noite) — início decide a classificação
 * de quem não tem turno fixo (ver src/lib/turno.ts:classificarTurno), fim
 * é o horaSaida usado pelo cron de fechamento automático
 * (src/lib/fechamento-automatico.ts) quando ninguém bateu saída. */
export async function atualizarHorarioFechamento(
  _prev: HorarioFechamentoState,
  formData: FormData
): Promise<HorarioFechamentoState> {
  const sessao = await requireModulo("configuracoes");

  const horarioInicioDiaMin = paraMinutosHorario(String(formData.get("horarioInicioDia") ?? ""));
  const horarioInicioNoiteMin = paraMinutosHorario(String(formData.get("horarioInicioNoite") ?? ""));
  const horarioFechamentoDiaMin = paraMinutosHorario(String(formData.get("horarioFechamentoDia") ?? ""));
  const horarioFechamentoNoiteMin = paraMinutosHorario(String(formData.get("horarioFechamentoNoite") ?? ""));
  if (
    horarioInicioDiaMin === null ||
    horarioInicioNoiteMin === null ||
    horarioFechamentoDiaMin === null ||
    horarioFechamentoNoiteMin === null
  ) {
    return { erro: "Informe os quatro horários válidos (HH:MM)." };
  }
  if (horarioInicioDiaMin >= horarioInicioNoiteMin) {
    return { erro: "O início do turno do dia precisa ser antes do início do turno da noite." };
  }
  if (horarioFechamentoDiaMin >= horarioFechamentoNoiteMin) {
    return { erro: "O fim do turno do dia precisa ser antes do fim do turno da noite." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { horarioInicioDiaMin, horarioInicioNoiteMin, horarioFechamentoDiaMin, horarioFechamentoNoiteMin },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type HorarioEscalaCltState = { erro?: string; sucesso?: boolean } | undefined;

/** Horário padrão de entrada/saída por escala CLT (5x2, 6x1, 12x36) — cada
 * par é opcional independente dos outros (uma empresa pode só ter gente na
 * 6x1 e nunca preencher os outros dois). OUTRA não aparece aqui de
 * propósito, ver comentário no schema. Uma pessoa específica pode
 * sobrescrever isso em /funcionarios/[id] (ver atualizarSalarioEscala).
 * Usado por horarioEsperadoClt (src/lib/ponto.ts) pra comparar contra o
 * ponto batido de verdade. */
export async function atualizarHorarioEscalaClt(
  _prev: HorarioEscalaCltState,
  formData: FormData
): Promise<HorarioEscalaCltState> {
  const sessao = await requireModulo("configuracoes");

  function par(entradaCampo: string, saidaCampo: string): [number | null, number | null] | { erro: string } {
    const entradaBruta = String(formData.get(entradaCampo) ?? "").trim();
    const saidaBruta = String(formData.get(saidaCampo) ?? "").trim();
    if (!entradaBruta && !saidaBruta) return [null, null];
    const entrada = paraMinutosHorario(entradaBruta);
    const saida = paraMinutosHorario(saidaBruta);
    if (entrada === null || saida === null) {
      return { erro: "Preencha entrada e saída juntas (ou deixe as duas em branco)." };
    }
    return [entrada, saida];
  }

  const cincoXDois = par("horarioEntrada5x2", "horarioSaida5x2");
  if ("erro" in cincoXDois) return cincoXDois;
  const cincoXDoisNoite = par("horarioEntrada5x2Noite", "horarioSaida5x2Noite");
  if ("erro" in cincoXDoisNoite) return cincoXDoisNoite;
  const seisXUm = par("horarioEntrada6x1", "horarioSaida6x1");
  if ("erro" in seisXUm) return seisXUm;
  const seisXUmNoite = par("horarioEntrada6x1Noite", "horarioSaida6x1Noite");
  if ("erro" in seisXUmNoite) return seisXUmNoite;
  const dozeXTrintaSeis = par("horarioEntrada12x36", "horarioSaida12x36");
  if ("erro" in dozeXTrintaSeis) return dozeXTrintaSeis;
  const dozeXTrintaSeisNoite = par("horarioEntrada12x36Noite", "horarioSaida12x36Noite");
  if ("erro" in dozeXTrintaSeisNoite) return dozeXTrintaSeisNoite;

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: {
      horarioEntrada5x2Min: cincoXDois[0],
      horarioSaida5x2Min: cincoXDois[1],
      horarioEntrada5x2NoiteMin: cincoXDoisNoite[0],
      horarioSaida5x2NoiteMin: cincoXDoisNoite[1],
      horarioEntrada6x1Min: seisXUm[0],
      horarioSaida6x1Min: seisXUm[1],
      horarioEntrada6x1NoiteMin: seisXUmNoite[0],
      horarioSaida6x1NoiteMin: seisXUmNoite[1],
      horarioEntrada12x36Min: dozeXTrintaSeis[0],
      horarioSaida12x36Min: dozeXTrintaSeis[1],
      horarioEntrada12x36NoiteMin: dozeXTrintaSeisNoite[0],
      horarioSaida12x36NoiteMin: dozeXTrintaSeisNoite[1],
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  revalidatePath("/funcionarios");
  return { sucesso: true };
}

export type SemanaPagamentoState = { erro?: string; sucesso?: boolean } | undefined;

const DIAS_SEMANA_VALIDOS = [1, 2, 3, 4, 5, 6, 7];

/** Configuração da semana de pagamento pra quem está em frequência SEMANAL
 * (ver VinculoPessoaEmpresa.frequenciaPagamento) — de qual dia a qual dia
 * ela conta, e em qual dia o valor acumulado é pago. */
export async function atualizarSemanaPagamento(
  _prev: SemanaPagamentoState,
  formData: FormData
): Promise<SemanaPagamentoState> {
  const sessao = await requireModulo("configuracoes");

  const inicioDia = Number(formData.get("semanaPagamentoInicioDia"));
  const diaPagamento = Number(formData.get("semanaPagamentoDia"));

  if (!DIAS_SEMANA_VALIDOS.includes(inicioDia) || !DIAS_SEMANA_VALIDOS.includes(diaPagamento)) {
    return { erro: "Selecione dias da semana válidos." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { semanaPagamentoInicioDia: inicioDia, semanaPagamentoDia: diaPagamento },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type ContagemLimpezaTurnos =
  | { erro: string }
  | { turnos: number; valorTotal: number; registrosPonto: number };

/** Só conta, não apaga nada — pra mostrar o impacto antes da pessoa
 * confirmar. Reaproveitado tanto na prévia quanto validado de novo dentro
 * de limparTurnosAntesDe, pra nunca apagar sem antes checar o que tem. */
async function buscarRegistrosParaLimpeza(empresaId: number, cutoff: Date) {
  const [turnos, registrosPonto] = await Promise.all([
    prisma.turno.findMany({
      where: { empresaId, horaEntrada: { lt: cutoff } },
      select: { id: true, valorTotal: true },
    }),
    prisma.registroPonto.count({
      where: { empresaId, horaEntrada: { lt: cutoff } },
    }),
  ]);
  return { turnos, registrosPonto };
}

export async function contarTurnosAntesDe(cutoffISO: string): Promise<ContagemLimpezaTurnos> {
  const sessao = await requireModulo("configuracoes");
  const cutoff = new Date(cutoffISO);
  if (Number.isNaN(cutoff.getTime())) return { erro: "Data inválida." };

  const { turnos, registrosPonto } = await buscarRegistrosParaLimpeza(
    sessao.empresaEfetivoId,
    cutoff
  );
  const valorTotal = turnos.reduce((soma, t) => soma + Number(t.valorTotal ?? 0), 0);

  return { turnos: turnos.length, valorTotal, registrosPonto };
}

export type LimpezaTurnosState = { erro?: string; sucesso?: true; apagados?: number } | undefined;

/** Apaga turnos (e pagamentos ligados, via cascade do schema) e registros de
 * ponto CLT anteriores à data escolhida — pensado pro período de teste que
 * sempre acontece quando uma empresa nova começa a usar o totem, antes do
 * "vale pra valer" de verdade. Cadastros de pessoa e vínculo NUNCA são
 * tocados aqui — só o histórico de jornada/pagamento. */
export async function limparTurnosAntesDe(
  _prev: LimpezaTurnosState,
  formData: FormData
): Promise<LimpezaTurnosState> {
  const sessao = await requireModulo("configuracoes");

  const cutoffISO = String(formData.get("cutoff") ?? "");
  const cutoff = new Date(cutoffISO);
  if (Number.isNaN(cutoff.getTime())) return { erro: "Data inválida." };

  const { turnos } = await buscarRegistrosParaLimpeza(sessao.empresaEfetivoId, cutoff);

  await prisma.$transaction([
    prisma.turno.deleteMany({
      where: { empresaId: sessao.empresaEfetivoId, horaEntrada: { lt: cutoff } },
    }),
    prisma.registroPonto.deleteMany({
      where: { empresaId: sessao.empresaEfetivoId, horaEntrada: { lt: cutoff } },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/v2/dashboard");
  revalidatePath("/turnos");
  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
  revalidatePath("/funcionarios");
  revalidatePath("/relatorios");

  return { sucesso: true, apagados: turnos.length };
}

function baseUrlAsaas(): string {
  return process.env.ASAAS_API_BASE_URL ?? "https://api-sandbox.asaas.com/v3";
}

/// Os dois webhooks que toda subconta precisa ter registrados nela mesma
/// pra funcionar (o de autorização, diferente, é configurado uma única vez
/// na conta-mãe e já vale pra todas — ver
/// src/app/api/webhooks/asaas/autorizacao/route.ts). Token PRÓPRIO por
/// webhook (isola o raio de exposição de cada um).
const WEBHOOKS_POR_SUBCONTA = [
  {
    nome: "iFREE - status de transferência",
    url: "https://ifree.app.br/api/webhooks/asaas/transferencia",
    tokenEnv: "ASAAS_WEBHOOK_TRANSFERENCIA_TOKEN",
    eventos: ["TRANSFER_DONE", "TRANSFER_FAILED", "TRANSFER_CANCELLED"],
  },
  {
    nome: "iFREE - confirmação de depósito",
    url: "https://ifree.app.br/api/webhooks/asaas/deposito",
    tokenEnv: "ASAAS_WEBHOOK_DEPOSITO_TOKEN",
    eventos: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"],
  },
] as const;

/** Registra, na subconta recém-criada, todos os webhooks de
 * WEBHOOKS_POR_SUBCONTA — devolve um aviso (texto pra mostrar no form) se
 * algum não puder ser registrado, mas nunca lança: a conta em si já foi
 * criada com sucesso antes desta função ser chamada, isso aqui é só o
 * complemento. */
async function registrarWebhooksNaSubconta(apiKeySubconta: string): Promise<string | undefined> {
  const falhas: string[] = [];
  for (const webhook of WEBHOOKS_POR_SUBCONTA) {
    const token = process.env[webhook.tokenEnv];
    if (!token) {
      falhas.push(webhook.nome);
      continue;
    }
    try {
      const resposta = await fetch(`${baseUrlAsaas()}/webhooks`, {
        method: "POST",
        headers: { access_token: apiKeySubconta, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: webhook.nome,
          url: webhook.url,
          email: "thiagodier@gmail.com",
          enabled: true,
          interrupted: false,
          apiVersion: 3,
          authToken: token,
          sendType: "NON_SEQUENTIALLY",
          events: webhook.eventos,
        }),
      });
      if (!resposta.ok) falhas.push(webhook.nome);
    } catch {
      falhas.push(webhook.nome);
    }
  }
  if (falhas.length === 0) return undefined;
  return `Conta criada, mas não consegui registrar: ${falhas.join(", ")} — avise o suporte.`;
}

const COMPANY_TYPES_ASAAS = ["MEI", "INDIVIDUAL", "LIMITED", "ASSOCIATION"] as const;

export type ConectarAsaasState = { erro?: string; sucesso?: boolean; aviso?: string } | undefined;

/** Cria a subconta Asaas desta empresa (dinheiro dela, isolado das outras —
 * ver o desenho completo em src/lib/pagamentos/asaas-payment-service.ts) e
 * já registra nela o webhook que avisa quando uma transferência termina —
 * OBRIGATÓRIO fazer isso na hora da criação: um webhook configurado só na
 * conta-mãe não cobre transferência de subconta nenhuma (confirmado
 * testando de verdade em 2026-09-07), então uma subconta sem esse passo
 * fica sem confirmação automática de pagamento (só o cron de conferência,
 * 2x por dia, resolveria).
 *
 * Aberto a qualquer usuário com acesso à empresa (não só master) desde
 * 2026-09-07 — depois de validado com dinheiro real na DB25, faz sentido o
 * próprio dono da empresa conectar sozinho (ver GuiaAtivacaoPagamento em
 * ContaAsaasForm.tsx, que explica o passo a passo pra ele). */
export async function conectarContaAsaas(
  _prev: ConectarAsaasState,
  formData: FormData
): Promise<ConectarAsaasState> {
  const sessao = await requireModulo("configuracoes");
  if (!sessao.empresaEfetivoId) return { erro: "Selecione uma empresa primeiro." };

  const erroSenha = await confirmarSenhaOuErro(sessao.usuarioId, String(formData.get("senha") ?? ""));
  if (erroSenha) return { erro: erroSenha };

  const apiKeyMestra = process.env.ASAAS_API_KEY;
  if (!apiKeyMestra) return { erro: "Integração com a Asaas ainda não configurada no ambiente." };

  const jaConectada = await prisma.contaAsaasEmpresa.findUnique({
    where: { empresaId: sessao.empresaEfetivoId },
  });
  if (jaConectada) return { erro: "Essa empresa já tem uma conta de pagamento conectada." };

  const email = String(formData.get("email") ?? "").trim();
  const companyType = String(formData.get("companyType") ?? "");
  const incomeValue = Number(formData.get("incomeValue"));
  const address = String(formData.get("address") ?? "").trim();
  const addressNumber = String(formData.get("addressNumber") ?? "").trim();
  const complement = String(formData.get("complement") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").replace(/\D/g, "");
  const province = String(formData.get("province") ?? "").trim();
  if (!email.includes("@")) return { erro: "Informe um e-mail válido." };
  if (!COMPANY_TYPES_ASAAS.includes(companyType as (typeof COMPANY_TYPES_ASAAS)[number])) {
    return { erro: "Selecione o tipo de empresa." };
  }
  if (!Number.isFinite(incomeValue) || incomeValue <= 0) {
    return { erro: "Informe o faturamento mensal estimado." };
  }
  // Endereço completo: a Asaas exige em PRODUÇÃO (não exige no sandbox —
  // descoberto na prática conectando a DB25 em 2026-09-07), então valida
  // aqui pra dar um erro amigável em vez de estourar na chamada da API.
  if (!address || !addressNumber || !postalCode || !province) {
    return { erro: "Preencha endereço, número, CEP e bairro." };
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, cnpj: true },
  });

  const respostaConta = await fetch(`${baseUrlAsaas()}/accounts`, {
    method: "POST",
    headers: { access_token: apiKeyMestra, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: empresa.nome,
      email,
      cpfCnpj: empresa.cnpj,
      companyType,
      incomeValue,
      address,
      addressNumber,
      complement: complement || undefined,
      postalCode,
      province,
    }),
  });
  const dadosConta = await respostaConta.json().catch(() => null);
  if (!respostaConta.ok || !dadosConta?.apiKey) {
    const mensagem = dadosConta?.errors?.[0]?.description ?? "Falha ao criar a conta na Asaas.";
    return { erro: mensagem };
  }

  await prisma.contaAsaasEmpresa.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      accountId: dadosConta.id,
      walletId: dadosConta.walletId ?? null,
      apiKeyCriptografada: criptografar(dadosConta.apiKey),
      status: "PENDENTE_ATIVACAO",
    },
  });

  const aviso = await registrarWebhooksNaSubconta(dadosConta.apiKey);

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true, aviso };
}

/** Alternativa a conectarContaAsaas pra quando o CNPJ da empresa JÁ tem
 * conta na Asaas (POST /accounts recusa criar uma segunda conta pro mesmo
 * CNPJ) — em vez de criar uma subconta nova, a pessoa gera uma API Key na
 * própria conta dela (Asaas → Integrações → Chave de API) e cola aqui. A
 * partir da chave validada, o resto do sistema (saldo, depósito com split,
 * status de documentos, Pix pros extras) funciona idêntico a uma subconta
 * criada por nós — nenhum desses fluxos liga pra quem criou a conta,
 * só precisam de uma API key válida e do walletId. */
export async function conectarContaAsaasExistente(
  _prev: ConectarAsaasState,
  formData: FormData
): Promise<ConectarAsaasState> {
  const sessao = await requireModulo("configuracoes");
  if (!sessao.empresaEfetivoId) return { erro: "Selecione uma empresa primeiro." };

  const erroSenha = await confirmarSenhaOuErro(sessao.usuarioId, String(formData.get("senha") ?? ""));
  if (erroSenha) return { erro: erroSenha };

  const jaConectada = await prisma.contaAsaasEmpresa.findUnique({
    where: { empresaId: sessao.empresaEfetivoId },
  });
  if (jaConectada) return { erro: "Essa empresa já tem uma conta de pagamento conectada." };

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { erro: "Cole a chave de API da sua conta Asaas." };

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { cnpj: true },
  });

  const respostaConta = await fetch(`${baseUrlAsaas()}/myAccount`, { headers: { access_token: apiKey } });
  const dadosConta = await respostaConta.json().catch(() => null);
  if (!respostaConta.ok || !dadosConta?.cpfCnpj) {
    return { erro: dadosConta?.errors?.[0]?.description ?? "Chave inválida — confira se copiou certinho." };
  }

  // Trava de segurança: sem isso, colar por engano a chave de uma conta
  // Asaas de outro CNPJ conectaria o dinheiro de OUTRA empresa/pessoa a
  // esta empresa no iFREE — verifica que a conta pertence mesmo ao CNPJ
  // cadastrado antes de guardar qualquer coisa.
  const cnpjConta = String(dadosConta.cpfCnpj ?? "").replace(/\D/g, "");
  const cnpjEmpresa = empresa.cnpj.replace(/\D/g, "");
  if (cnpjConta !== cnpjEmpresa) {
    return { erro: "Essa chave pertence a uma conta Asaas de outro CNPJ — confira se é a chave certa." };
  }

  // GET /myAccount não devolve NENHUM id (confirmado ao vivo em
  // 2026-09-08 — nem "id" nem "walletId"), só /wallets/ devolve um
  // identificador confiável (ver o mesmo achado em walletIdContaMae, src/
  // lib/pagamentos/asaas-deposito.ts). Aqui esse identificador vira tanto
  // o walletId quanto o accountId da nossa própria linha — diferente do
  // fluxo de criar conta nova (onde o accountId vem de POST /accounts),
  // mas accountId não é usado em mais nenhuma chamada à Asaas no projeto,
  // só guardado como referência única, então serve igual.
  const respostaWallet = await fetch(`${baseUrlAsaas()}/wallets/`, { headers: { access_token: apiKey } });
  const dadosWallet = respostaWallet.ok ? await respostaWallet.json().catch(() => null) : null;
  const walletId = typeof dadosWallet?.data?.[0]?.id === "string" ? dadosWallet.data[0].id : null;
  if (!walletId) {
    return { erro: "Não consegui confirmar os dados dessa conta na Asaas agora — tenta de novo em instantes." };
  }

  try {
    await prisma.contaAsaasEmpresa.create({
      data: {
        empresaId: sessao.empresaEfetivoId,
        accountId: walletId,
        walletId,
        apiKeyCriptografada: criptografar(apiKey),
        status: dadosConta.status === "APPROVED" ? "ATIVA" : dadosConta.status === "REPROVED" ? "BLOQUEADA" : "PENDENTE_ATIVACAO",
      },
    });
  } catch (erro) {
    const codigo = (erro as { code?: string } | null)?.code;
    if (codigo === "P2002") {
      return { erro: "Essa conta Asaas já está conectada a outra empresa no iFREE." };
    }
    throw erro;
  }

  const aviso = await registrarWebhooksNaSubconta(apiKey);

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true, aviso };
}

/** Substitui a chave de API já conectada — pro caso de a chave colada em
 * conectarContaAsaasExistente ter vindo sem alguma permissão necessária
 * (ex.: "A chave de API fornecida não possui permissão para realizar
 * operações de saque via API", visto na prática com a CARBONI E DIER em
 * 2026-09-09: chave gerada pelo painel próprio da Asaas sem a permissão
 * de Transferência marcada). Sem isso, a única saída seria desconectar e
 * reconectar do zero. Mesmas validações de conectarContaAsaasExistente
 * (CNPJ tem que bater), mas em vez de criar, faz update na linha que já
 * existe — accountId não muda (nem é usado em nenhuma chamada à Asaas,
 * só guardado como referência). */
export async function atualizarChaveAsaas(
  _prev: ConectarAsaasState,
  formData: FormData
): Promise<ConectarAsaasState> {
  const sessao = await requireModulo("configuracoes");
  if (!sessao.empresaEfetivoId) return { erro: "Selecione uma empresa primeiro." };

  const erroSenha = await confirmarSenhaOuErro(sessao.usuarioId, String(formData.get("senha") ?? ""));
  if (erroSenha) return { erro: erroSenha };

  const contaAtual = await prisma.contaAsaasEmpresa.findUnique({
    where: { empresaId: sessao.empresaEfetivoId },
  });
  if (!contaAtual) return { erro: "Essa empresa ainda não tem conta conectada." };

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { erro: "Cole a nova chave de API." };

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { cnpj: true },
  });

  const respostaConta = await fetch(`${baseUrlAsaas()}/myAccount`, { headers: { access_token: apiKey } });
  const dadosConta = await respostaConta.json().catch(() => null);
  if (!respostaConta.ok || !dadosConta?.cpfCnpj) {
    return { erro: dadosConta?.errors?.[0]?.description ?? "Chave inválida — confira se copiou certinho." };
  }

  const cnpjConta = String(dadosConta.cpfCnpj ?? "").replace(/\D/g, "");
  const cnpjEmpresa = empresa.cnpj.replace(/\D/g, "");
  if (cnpjConta !== cnpjEmpresa) {
    return { erro: "Essa chave pertence a uma conta Asaas de outro CNPJ — confira se é a chave certa." };
  }

  const respostaWallet = await fetch(`${baseUrlAsaas()}/wallets/`, { headers: { access_token: apiKey } });
  const dadosWallet = respostaWallet.ok ? await respostaWallet.json().catch(() => null) : null;
  const walletId = typeof dadosWallet?.data?.[0]?.id === "string" ? dadosWallet.data[0].id : contaAtual.walletId;

  await prisma.contaAsaasEmpresa.update({
    where: { empresaId: sessao.empresaEfetivoId },
    data: {
      apiKeyCriptografada: criptografar(apiKey),
      walletId,
      status:
        dadosConta.status === "APPROVED" ? "ATIVA" : dadosConta.status === "REPROVED" ? "BLOQUEADA" : "PENDENTE_ATIVACAO",
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  return { sucesso: true };
}

export type AcaoContaAsaasState = { erro?: string; sucesso?: boolean } | undefined;

/** Desliga o pagamento automático desta empresa a pedido do dono — NÃO
 * apaga a conexão (accountId/apiKey/walletId continuam guardados), só marca
 * desconectadoEm pra automatizado() (src/lib/pagamentos/processar.ts) parar
 * de considerar essa empresa elegível. Turnos voltam a cair no fluxo manual
 * de sempre. Reversível a qualquer momento via reconectarContaAsaas, sem
 * precisar criar outra subconta na Asaas nem reenviar documento nenhum. */
export async function desconectarContaAsaas(): Promise<AcaoContaAsaasState> {
  const sessao = await requireModulo("configuracoes");

  const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({
    where: { empresaId: sessao.empresaEfetivoId },
    select: { id: true },
  });
  if (!contaAsaas) return { erro: "Essa empresa não tem conta de pagamento conectada." };

  await prisma.contaAsaasEmpresa.update({
    where: { empresaId: sessao.empresaEfetivoId },
    data: { desconectadoEm: new Date() },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  revalidatePath("/pagamentos");
  return { sucesso: true };
}

/** Reativa o pagamento automático de uma conta previamente desconectada —
 * só limpa desconectadoEm, a subconta na Asaas nunca deixou de existir. */
export async function reconectarContaAsaas(): Promise<AcaoContaAsaasState> {
  const sessao = await requireModulo("configuracoes");

  const contaAsaas = await prisma.contaAsaasEmpresa.findUnique({
    where: { empresaId: sessao.empresaEfetivoId },
    select: { id: true },
  });
  if (!contaAsaas) return { erro: "Essa empresa não tem conta de pagamento conectada." };

  await prisma.contaAsaasEmpresa.update({
    where: { empresaId: sessao.empresaEfetivoId },
    data: { desconectadoEm: null },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/v2/configuracoes");
  revalidatePath("/pagamentos");
  return { sucesso: true };
}
