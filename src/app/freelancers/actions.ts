"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { detectarTipoChavePix, chavePixValida } from "@/lib/documento";
import { instanteBrasil } from "@/lib/data";

export type ConverterVinculoState = { erro: string } | undefined;

/** Promove um extra a funcionário CLT — pra quando alguém que começou
 * batendo turno acaba sendo efetivado. Mantém o cadastro da Pessoa intacto,
 * só troca o tipo do vínculo com esta empresa. Não bloqueia mesmo se
 * houver turno em aberto — a conversão troca só o tipo do vínculo pra
 * frente, o turno em aberto continua existindo e sendo fechado/pago
 * normalmente como turno de extra, decisão explícita do dono. Turnos e
 * pagamentos já existentes NUNCA são apagados/alterados por esta ação —
 * são histórico real de trabalho como extra, legítimo mesmo que a pessoa
 * já fosse "pra ser" CLT desde antes (ex.: cadastro atrasado).
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
 * src/lib/ferias.ts e src/lib/experiencia.ts), sem mexer nos turnos extra
 * já pagos nesse meio-tempo. Se omitido, dataAdmissao fica em branco pra
 * preencher depois em /funcionarios/[id] (caso de conversão "a partir de
 * hoje", sem histórico relevante a preservar).
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
  const sessao = await requireTenant();

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

  revalidatePath("/freelancers");
  revalidatePath("/funcionarios");
  redirect(`/funcionarios/${pessoaId}`);
}

export async function alternarAtivoVinculo(pessoaId: number, ativo: boolean) {
  const sessao = await requireTenant();

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
  const sessao = await requireTenant();

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
  const sessao = await requireTenant();

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
  const sessao = await requireTenant();

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
  const sessao = await requireTenant();

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
