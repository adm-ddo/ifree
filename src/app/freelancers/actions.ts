"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { detectarTipoChavePix, chavePixValida } from "@/lib/documento";
import { instanteBrasil } from "@/lib/data";
import { STATUS_PENDENTES } from "@/lib/financeiro";
import { classificarTurno } from "@/lib/turno";
import { calcularMinutosPonto, resolverModoPausaClt } from "@/lib/ponto";

export type ConverterVinculoState = { erro: string } | undefined;

/** Promove um extra a funcionário CLT — pra quando alguém que começou
 * batendo turno acaba sendo efetivado. Mantém o cadastro da Pessoa intacto,
 * só troca o tipo do vínculo com esta empresa. Turnos e pagamentos de
 * ANTES da data de admissão NUNCA são apagados/alterados — são histórico
 * real de trabalho como extra, legítimo mesmo que a pessoa já fosse "pra
 * ser" CLT desde antes (ex.: cadastro atrasado).
 *
 * Limpa os campos de valor do modo EXTRA (modoPagamento, valorDiaria,
 * frequenciaPagamento) — funcionário CLT não é pago por este sistema, só
 * fica gravada a questão dos horários/cadastro CLT; não faz sentido ficar
 * com valor nenhum ligado a ela depois da conversão.
 *
 * `dataAdmissao` (opcional, "YYYY-MM-DD") cobre o caso de conversão
 * atrasada: a pessoa já trabalhava/deveria ser CLT desde antes de o dono
 * lembrar de converter no sistema — nesse caso a data de admissão real
 * fica retroativa (base do cálculo de férias/experiência em
 * src/lib/ferias.ts e src/lib/experiencia.ts). Se omitido, dataAdmissao
 * fica em branco pra preencher depois em /funcionarios/[id] (caso de
 * conversão "a partir de hoje", sem histórico relevante a preservar).
 *
 * Quando informada, DATA DE ADMISSÃO NO PASSADO OU HOJE dispara uma
 * migração automática dos turnos de extra dessa pessoa nesta empresa a
 * partir daquele dia (ver migrarTurnosExtraParaClt abaixo): o trabalho
 * daquele dia em diante já é CLT de verdade (salário, não PIX avulso), por
 * mais que a pessoa tenha batido o check-in pelo fluxo de extra antes do
 * dono lembrar de converter no sistema. Caso real que motivou isto:
 * Thiago pediu em 2026-09-24 (Julie Kelly, DB25) — ela virou CLT no dia
 * 18/09, mas a conversão no sistema só aconteceu depois de ela já ter
 * batido aquele turno como extra, e o pagamento automático (que falhou
 * por saldo insuficiente, sem relação nenhuma com a conversão) ficou
 * pendente pra sempre sem ninguém perceber que devia ser dispensado.
 *
 * Retorna { erro } em vez de lançar exceção: Server Actions chamadas
 * direto (sem passar por <form action>) têm a mensagem de erro REDACTED
 * em produção quando lançada via throw — o cliente só recebe "An error
 * occurred..." com um digest, sem o texto real. Retornar como dado normal
 * evita esse problema. */
export async function converterParaClt(
  pessoaId: number,
  dataAdmissao?: string | null
): Promise<ConverterVinculoState> {
  const sessao = await requireModulo("freelancers");

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
    include: { pessoa: { select: { tipoDocumento: true } } },
  });
  if (!vinculo) return { erro: "Esse freelancer não pertence a esta empresa." };
  if (vinculo.tipoVinculo === "CLT") return { erro: "Essa pessoa já é funcionário CLT." };
  // CLT exige CPF por lei — quem se cadastrou com CNPJ (MEI) precisa
  // primeiro corrigir o documento antes de virar funcionário fixo.
  if (vinculo.pessoa.tipoDocumento !== "CPF") {
    return { erro: "Essa pessoa está cadastrada com CNPJ — CLT exige CPF. Corrija o documento antes de converter." };
  }

  let dataAdmissaoValida: Date | null = null;
  if (dataAdmissao) {
    dataAdmissaoValida = instanteBrasil(dataAdmissao);
    if (Number.isNaN(dataAdmissaoValida.getTime())) {
      return { erro: "Informe uma data de admissão válida, ou deixe em branco." };
    }
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: {
      tipoVinculo: "CLT",
      modoPagamento: "HORA",
      valorDiaria: null,
      frequenciaPagamento: "DIARIA",
      ...(dataAdmissaoValida ? { dataAdmissao: dataAdmissaoValida } : {}),
    },
  });

  if (dataAdmissaoValida) {
    await migrarTurnosExtraParaClt(pessoaId, sessao.empresaEfetivoId!, dataAdmissaoValida);
  }

  revalidatePath("/freelancers");
  revalidatePath("/funcionarios");
  redirect(`/funcionarios/${pessoaId}`);
}

/** Turnos de extra desta pessoa, nesta empresa, com entrada NO DIA da
 * admissão CLT ou depois — cobre o caso de conversão feita depois de a
 * pessoa já ter batido o check-in daquele dia como extra (ver comentário
 * completo em converterParaClt acima).
 *
 * Turno já FECHADO (tem horaSaida) vira um RegistroPonto espelhado, com a
 * mesma foto de entrada/saída de verdade tirada no totem — é o mesmo
 * check-in real, só passa a valer como jornada CLT em vez de turno pago.
 * Sem RegistroPonto.fotoEntradaUrl (campo obrigatório lá, ao contrário de
 * Turno) não tem como migrar — só acontece pra turno lançado manualmente
 * pelo dono sem foto (Turno.criadoManualmente), caso raro o bastante pra
 * só pular a migração em vez de resolver sozinho; o dono resolve o ponto
 * na mão em /funcionarios/[id].
 *
 * Turno ainda ABERTO na hora da conversão não é migrado — não dá pra saber
 * a que horas a pessoa vai bater saída, e forçar uma agora seria inventar
 * dado. Fica como turno de extra normal (fecha e tenta pagar sozinho como
 * sempre); se isso não for o que o dono quer, o card de "Pagamentos de
 * extra pendentes" em /funcionarios/[id] continua disponível pra dispensar
 * na mão depois que fechar.
 *
 * Em qualquer caso (migrado ou não), qualquer pagamento ainda
 * PENDENTE/FALHOU/PROCESSANDO desses turnos é dispensado (CANCELADO) — o
 * dono já deixou claro que não quer pagar via PIX o que virou salário
 * CLT. Mesmo efeito de zerarPagamentosExtraPendentes (funcionarios/
 * actions.ts), só que automático no momento da conversão em vez de exigir
 * um segundo passo manual. */
async function migrarTurnosExtraParaClt(
  pessoaId: number,
  empresaId: number,
  dataAdmissao: Date
): Promise<void> {
  const turnosAfetados = await prisma.turno.findMany({
    where: { pessoaId, empresaId, horaEntrada: { gte: dataAdmissao } },
  });
  if (turnosAfetados.length === 0) return;

  const turnosParaMigrar = turnosAfetados.filter((t) => t.horaSaida && t.fotoEntradaUrl);
  if (turnosParaMigrar.length > 0) {
    // Mesmo cálculo de horas trabalhadas/hora extra que o fechamento normal
    // do ponto CLT faz (ver SAIDA_FINAL em src/app/t/[token]/actions.ts) —
    // sem isso o registro migrado ficava sem "Xh trabalhadas" nem hora
    // extra/horas devidas na tela, porque RegistroPontoHistorico.tsx lê
    // esses campos direto do banco, não recalcula sozinho.
    const [empresa, vinculo] = await Promise.all([
      prisma.empresa.findUniqueOrThrow({
        where: { id: empresaId },
        select: {
          modoPausaCltDia: true,
          modoPausaCltNoite: true,
          horarioInicioDiaMin: true,
          horarioInicioNoiteMin: true,
        },
      }),
      prisma.vinculoPessoaEmpresa.findUniqueOrThrow({
        where: { pessoaId_empresaId: { pessoaId, empresaId } },
        select: { turnoPredefinido: true, modoPausaOverride: true },
      }),
    ]);

    for (const turno of turnosParaMigrar) {
      const tipoTurno = classificarTurno(
        turno.horaEntrada,
        vinculo.turnoPredefinido,
        empresa.horarioInicioDiaMin,
        empresa.horarioInicioNoiteMin
      );
      const modoPausaAplicavel = resolverModoPausaClt(vinculo.modoPausaOverride, tipoTurno, empresa);
      const { minutosTrabalhados, minutosDescontadosPausa } = calcularMinutosPonto({
        horaEntrada: turno.horaEntrada,
        horaSaida: turno.horaSaida!,
        modoPausa: modoPausaAplicavel,
      });

      await prisma.registroPonto.create({
        data: {
          pessoaId,
          empresaId,
          totemId: turno.totemId,
          horaEntrada: turno.horaEntrada,
          horaSaida: turno.horaSaida,
          minutosTrabalhados,
          minutosDescontadosPausa,
          status: "CONCLUIDO",
          fotoEntradaUrl: turno.fotoEntradaUrl!,
          fotoSaidaUrl: turno.fotoSaidaUrl,
        },
      });
    }
  }

  await prisma.pagamento.updateMany({
    where: {
      status: { in: STATUS_PENDENTES },
      turnoId: { in: turnosAfetados.map((t) => t.id) },
    },
    data: { status: "CANCELADO" },
  });
}

export async function alternarAtivoVinculo(pessoaId: number, ativo: boolean) {
  const sessao = await requireModulo("freelancers");

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) {
    throw new Error("Esse freelancer não pertence a esta empresa.");
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { ativo },
  });

  revalidatePath("/freelancers");
}

/** Turno fixo da pessoa (manhã/noite/livre) — ajuda o fechamento
 * automático a saber qual corte aplicar quando ela esquece de bater
 * saída (ver src/lib/turno.ts:classificarTurno e
 * src/lib/fechamento-automatico.ts). LIVRE deixa o sistema inferir pelo
 * horário de entrada. Retorna { erro } em vez de lançar exceção — mesmo
 * motivo de converterParaClt acima (chamada direta, sem <form>). */
export async function atualizarTurnoPredefinido(
  pessoaId: number,
  turnoPredefinido: "MANHA" | "NOITE" | "LIVRE"
): Promise<ConverterVinculoState> {
  const sessao = await requireModulo("freelancers");

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) return { erro: "Esse freelancer não pertence a esta empresa." };

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { turnoPredefinido },
  });

  revalidatePath(`/freelancers/${pessoaId}`);
  return undefined;
}

export type PagamentoState = { erro?: string; sucesso?: boolean } | undefined;

/** Modo de pagamento é sempre decisão do dono, nunca do freelancer — se a
 * pessoa pudesse escolher, escolheria o mais vantajoso caso a caso (hora
 * quando sabe que vai ficar pouco, diária quando sabe que vai ficar o dia
 * todo), o que sai caro pra empresa. */
export async function atualizarModoPagamentoVinculo(
  _prev: PagamentoState,
  formData: FormData
): Promise<PagamentoState> {
  const sessao = await requireModulo("freelancers");

  const pessoaId = Number(formData.get("pessoaId"));
  const modoPagamento = String(formData.get("modoPagamento") ?? "");
  const frequenciaPagamento = String(formData.get("frequenciaPagamento") ?? "");
  if (!Number.isInteger(pessoaId)) return { erro: "Freelancer inválido." };
  if (modoPagamento !== "HORA" && modoPagamento !== "DIARIA") {
    return { erro: "Selecione um modo de pagamento válido." };
  }
  if (frequenciaPagamento !== "DIARIA" && frequenciaPagamento !== "SEMANAL") {
    return { erro: "Selecione uma frequência de pagamento válida." };
  }

  let valorDiaria: number | null = null;
  if (modoPagamento === "DIARIA") {
    const bruto = String(formData.get("valorDiaria") ?? "").replace(",", ".");
    valorDiaria = Number(bruto);
    if (!Number.isFinite(valorDiaria) || valorDiaria <= 0) {
      return { erro: "Informe um valor de diária válido." };
    }
  }

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) {
    return { erro: "Esse freelancer não pertence a esta empresa." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { modoPagamento, valorDiaria, frequenciaPagamento },
  });

  revalidatePath(`/freelancers/${pessoaId}`);
  return { sucesso: true };
}

export type MetaHorasState = { erro?: string; sucesso?: boolean } | undefined;

/** Meta de horas semanais opcional — só usada pra comparar contra o
 * trabalhado de verdade no resumo semanal/mensal (ver
 * src/lib/resumo-horas.ts) e sinalizar hora extra/a menos. Não afeta
 * pagamento nenhum: freelancer continua recebendo pelas horas reais, a
 * meta é só um número de referência que a empresa define se quiser
 * acompanhar. Em branco, essa pessoa não entra na comparação, só aparece
 * o total de horas trabalhadas. */
export async function atualizarMetaHorasVinculo(
  _prev: MetaHorasState,
  formData: FormData
): Promise<MetaHorasState> {
  const sessao = await requireModulo("freelancers");

  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Freelancer inválido." };

  const horasBruta = String(formData.get("cargaHorariaSemanalHoras") ?? "").trim();
  let cargaHorariaSemanalMin: number | null = null;
  if (horasBruta) {
    const horas = Number(horasBruta.replace(",", "."));
    if (!Number.isFinite(horas) || horas <= 0) {
      return { erro: "Informe uma carga horária semanal válida, ou deixe em branco." };
    }
    cargaHorariaSemanalMin = Math.round(horas * 60);
  }

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) return { erro: "Esse freelancer não pertence a esta empresa." };

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { cargaHorariaSemanalMin },
  });

  revalidatePath(`/freelancers/${pessoaId}`);
  return { sucesso: true };
}

export type DadosPessoaState = { erro?: string; sucesso?: boolean } | undefined;

/** Edição dos dados de contato/PIX do freelancer, direto pelo painel —
 * pra quando a pessoa não tem como fazer isso na hora pelo totem (ex.: só
 * lembra da chave PIX aleatória depois, longe do trabalho). Esses dados
 * são do cadastro global da Pessoa (não do vínculo com esta empresa
 * específica), então a edição vale pra todas as empresas onde ela
 * trabalha — mesmo comportamento de quando ela edita os próprios dados
 * pelo totem. O tipo da chave PIX é sempre detectado aqui no servidor, não
 * confia no que o formulário mandar. */
export async function atualizarDadosPessoaAdmin(
  _prev: DadosPessoaState,
  formData: FormData
): Promise<DadosPessoaState> {
  const sessao = await requireModulo("freelancers");

  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Freelancer inválido." };

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) return { erro: "Esse freelancer não pertence a esta empresa." };

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const complemento = String(formData.get("complemento") ?? "").trim();
  const chavePix = String(formData.get("chavePix") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();
  const dataNascimentoBruta = String(formData.get("dataNascimento") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const contatoEmergenciaNome = String(formData.get("contatoEmergenciaNome") ?? "").trim();
  const contatoEmergenciaTelefone = String(formData.get("contatoEmergenciaTelefone") ?? "").trim();

  if (!nome) return { erro: "Informe o nome completo." };
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };
  if (!chavePix) return { erro: "Informe a chave PIX." };
  if (email && !email.includes("@")) return { erro: "Informe um e-mail válido, ou deixe em branco." };

  const tipoChavePix = detectarTipoChavePix(chavePix);
  if (!chavePixValida(tipoChavePix, chavePix)) {
    return { erro: `A chave PIX não parece válida (detectada como ${tipoChavePix.toLowerCase()}).` };
  }

  const dataNascimento = dataNascimentoBruta ? new Date(dataNascimentoBruta) : null;
  if (dataNascimento && Number.isNaN(dataNascimento.getTime())) {
    return { erro: "Informe uma data de nascimento válida, ou deixe em branco." };
  }

  await prisma.pessoa.update({
    where: { id: pessoaId },
    data: {
      nome,
      telefone,
      endereco,
      numero,
      complemento: complemento || null,
      chavePix,
      tipoChavePix,
      email: email || null,
      rg: rg || null,
      dataNascimento,
      cep: cep || null,
      contatoEmergenciaNome: contatoEmergenciaNome || null,
      contatoEmergenciaTelefone: contatoEmergenciaTelefone || null,
    },
  });

  revalidatePath(`/freelancers/${pessoaId}`);
  revalidatePath("/freelancers");
  return { sucesso: true };
}
