"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apenasDigitos, cpfValido } from "@/lib/cpf";
import { detectarTipoChavePix, chavePixValida } from "@/lib/documento";
import { calcularMinutosPonto, paraMinutosHorario, resolverModoPausaClt } from "@/lib/ponto";
import { calcularMinutosArredondados, calcularValorTurno, classificarTurno } from "@/lib/turno";
import { processarPagamentoTurno } from "@/lib/pagamentos/processar";
import { dataISOBrasil, instanteBrasil } from "@/lib/data";
import { STATUS_PENDENTES } from "@/lib/financeiro";
import { parseRestricoesFormData } from "@/lib/restricao-horario";
import type { RestricaoHorarioState } from "@/components/RestricaoHorarioForm";
import type { EscalaTrabalho, ModoPausa, TipoChavePix } from "@/generated/prisma/enums";

/** "Hoje" como data-calendário (meia-noite UTC), no fuso de Brasília —
 * mesma representação usada pelos campos @db.Date (dataAdmissao,
 * ultimasFeriasGozadasEm, vigenteDesde). */
function hojeData(): Date {
  return instanteBrasil(dataISOBrasil(new Date()));
}

const ESCALAS_VALIDAS: EscalaTrabalho[] = [
  "CINCO_X_DOIS",
  "SEIS_X_UM",
  "DOZE_X_TRINTA_E_SEIS",
  "OUTRA",
];

const MODOS_PAUSA_VALIDOS: ModoPausa[] = ["NENHUMA", "AUTOMATICA_30", "AUTOMATICA_60"];

/** Chave PIX é opcional pra CLT (o sistema não paga salário) — só passa a
 * importar se a pessoa também lançar "turno extra pago no dia" (ver
 * checagem em CriarTurnoManualForm/ExtraDiarioForm). Em branco é sempre
 * válido; se preenchida, precisa ser uma chave de verdade, mesma
 * validação usada pro cadastro de extra. */
function validarChavePixOpcional(
  chavePixBruta: string
): { erro: string } | { chavePix: string | null; tipoChavePix: TipoChavePix | null } {
  const chavePix = chavePixBruta.trim();
  if (!chavePix) return { chavePix: null, tipoChavePix: null };
  const tipoChavePix = detectarTipoChavePix(chavePix);
  if (!chavePixValida(tipoChavePix, chavePix)) {
    return { erro: `A chave PIX não parece válida (detectada como ${tipoChavePix.toLowerCase()}).` };
  }
  return { chavePix, tipoChavePix };
}

async function vinculoCltDaEmpresa(pessoaId: number) {
  const sessao = await requireModulo("funcionarios");
  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") {
    throw new Error("Esse funcionário não pertence a esta empresa.");
  }
  return { sessao, vinculo };
}

export type NovoFuncionarioState = { erro?: string } | undefined;

/** Cadastro de funcionário CLT é sempre feito pelo dono aqui no painel —
 * diferente do extra, que se autocadastra no totem. Se a pessoa já existe
 * globalmente (ex.: já trabalhou como extra em algum lugar), não mexe nos
 * dados de contato dela — só cria/promove o vínculo com esta empresa pra
 * CLT, mesma lógica de "Pessoa é global, vínculo é por empresa" usada em
 * todo o resto do sistema. Sem chave PIX: funcionário CLT não é pago por
 * este sistema, então não precisa dela. */
export async function criarFuncionario(
  _prev: NovoFuncionarioState,
  formData: FormData
): Promise<NovoFuncionarioState> {
  const sessao = await requireModulo("funcionarios");

  const nome = String(formData.get("nome") ?? "").trim();
  const documentoBruto = String(formData.get("documento") ?? "");
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const complemento = String(formData.get("complemento") ?? "").trim();
  const salarioBruto = String(formData.get("salarioMensal") ?? "").replace(",", ".");
  const escalaTrabalho = String(formData.get("escalaTrabalho") ?? "");
  const cargaHorariaSemanalHoras = String(formData.get("cargaHorariaSemanalHoras") ?? "");
  const dataAdmissaoBruta = String(formData.get("dataAdmissao") ?? "").trim();
  const pisPasepNit = String(formData.get("pisPasepNit") ?? "").trim();
  const matriculaInterna = String(formData.get("matriculaInterna") ?? "").trim();
  const chavePixBruta = String(formData.get("chavePix") ?? "");

  if (!nome) return { erro: "Informe o nome completo." };
  if (!cpfValido(documentoBruto)) return { erro: "CPF inválido." };
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };
  // PIS/PASEP/NIT e matrícula são obrigatórios pra CLT (pedido explícito do
  // dono) — diferente de CTPS/cargo, que só passam a ser exigidos na hora
  // de gerar a advertência (ver atualizarDadosFuncionario/atualizarSalarioEscala).
  if (!pisPasepNit) return { erro: "Informe o PIS/PASEP/NIT — obrigatório pra funcionário CLT." };
  if (!matriculaInterna) return { erro: "Informe a matrícula interna — obrigatória pra funcionário CLT." };
  if (escalaTrabalho && !ESCALAS_VALIDAS.includes(escalaTrabalho as EscalaTrabalho)) {
    return { erro: "Escala de trabalho inválida." };
  }
  const escalaValida = escalaTrabalho ? (escalaTrabalho as EscalaTrabalho) : null;

  const chavePixResultado = validarChavePixOpcional(chavePixBruta);
  if ("erro" in chavePixResultado) return chavePixResultado;
  const { chavePix, tipoChavePix } = chavePixResultado;

  let salarioMensal: number | null = null;
  if (salarioBruto) {
    salarioMensal = Number(salarioBruto);
    if (!Number.isFinite(salarioMensal) || salarioMensal <= 0) {
      return { erro: "Informe um salário válido, ou deixe em branco." };
    }
  }

  let cargaHorariaSemanalMin: number | null = null;
  if (cargaHorariaSemanalHoras) {
    const horas = Number(cargaHorariaSemanalHoras.replace(",", "."));
    if (!Number.isFinite(horas) || horas <= 0) {
      return { erro: "Informe uma carga horária semanal válida, ou deixe em branco." };
    }
    cargaHorariaSemanalMin = Math.round(horas * 60);
  }

  const dataAdmissao = dataAdmissaoBruta ? instanteBrasil(dataAdmissaoBruta) : null;
  if (dataAdmissaoBruta && Number.isNaN(dataAdmissao?.getTime())) {
    return { erro: "Informe uma data de admissão válida, ou deixe em branco." };
  }

  const documento = apenasDigitos(documentoBruto);

  const pessoaExistente = await prisma.pessoa.findUnique({ where: { documento } });
  if (pessoaExistente) {
    const vinculoExistente = await prisma.vinculoPessoaEmpresa.findUnique({
      where: { pessoaId_empresaId: { pessoaId: pessoaExistente.id, empresaId: sessao.empresaEfetivoId } },
    });
    if (vinculoExistente?.tipoVinculo === "CLT") {
      return { erro: `${pessoaExistente.nome} já está cadastrado(a) como funcionário nesta empresa.` };
    }
    await prisma.$transaction(async (tx) => {
      await tx.pessoa.update({
        where: { id: pessoaExistente.id },
        data: { pisPasepNit, ...(chavePix ? { chavePix, tipoChavePix } : {}) },
      });
      const vinculo = await tx.vinculoPessoaEmpresa.upsert({
        where: { pessoaId_empresaId: { pessoaId: pessoaExistente.id, empresaId: sessao.empresaEfetivoId } },
        update: {
          tipoVinculo: "CLT",
          ativo: true,
          salarioMensal,
          escalaTrabalho: escalaValida,
          cargaHorariaSemanalMin,
          dataAdmissao,
          matriculaInterna,
        },
        create: {
          pessoaId: pessoaExistente.id,
          empresaId: sessao.empresaEfetivoId,
          tipoVinculo: "CLT",
          salarioMensal,
          escalaTrabalho: escalaValida,
          cargaHorariaSemanalMin,
          dataAdmissao,
          matriculaInterna,
        },
      });
      if (salarioMensal !== null) {
        await tx.historicoSalarial.create({
          data: { vinculoId: vinculo.id, valor: salarioMensal, vigenteDesde: hojeData() },
        });
      }
    });
    revalidatePath("/funcionarios");
    return undefined;
  }

  await prisma.$transaction(async (tx) => {
    const pessoa = await tx.pessoa.create({
      data: {
        nome,
        documento,
        tipoDocumento: "CPF",
        telefone,
        endereco,
        numero,
        complemento: complemento || null,
        pisPasepNit,
        chavePix,
        tipoChavePix,
      },
    });
    const vinculo = await tx.vinculoPessoaEmpresa.create({
      data: {
        pessoaId: pessoa.id,
        empresaId: sessao.empresaEfetivoId,
        tipoVinculo: "CLT",
        salarioMensal,
        escalaTrabalho: escalaValida,
        cargaHorariaSemanalMin,
        dataAdmissao,
        matriculaInterna,
      },
    });
    if (salarioMensal !== null) {
      await tx.historicoSalarial.create({
        data: { vinculoId: vinculo.id, valor: salarioMensal, vigenteDesde: hojeData() },
      });
    }
  });

  revalidatePath("/funcionarios");
}

export type ConverterVinculoState = { erro: string } | undefined;

/** Caminho inverso de converterParaClt (src/app/freelancers/actions.ts) —
 * pra quando alguém deixa de ser CLT mas continua fazendo turno como
 * extra. Não bloqueia mesmo com ponto em aberto — mesma decisão do lado
 * extra, um registro em andamento não deveria travar a conversão.
 *
 * Retorna { erro } em vez de lançar exceção — ver o comentário equivalente
 * em converterParaClt sobre mensagens de erro sendo redacted em produção
 * quando a action é chamada direto (sem <form action>). */
export async function converterParaExtra(pessoaId: number): Promise<ConverterVinculoState> {
  const sessao = await requireModulo("funcionarios");

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") {
    return { erro: "Esse funcionário não pertence a esta empresa." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { tipoVinculo: "EXTRA" },
  });

  revalidatePath("/funcionarios");
  revalidatePath("/freelancers");
  redirect(`/freelancers/${pessoaId}`);
}

export async function alternarAtivoFuncionario(pessoaId: number, ativo: boolean) {
  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);
  await prisma.vinculoPessoaEmpresa.update({ where: { id: vinculo.id }, data: { ativo } });
  revalidatePath("/funcionarios");
}

export type SalarioEscalaState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarSalarioEscala(
  _prev: SalarioEscalaState,
  formData: FormData
): Promise<SalarioEscalaState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };

  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);

  const salarioBruto = String(formData.get("salarioMensal") ?? "").replace(",", ".");
  const cargo = String(formData.get("cargo") ?? "").trim();
  const matriculaInterna = String(formData.get("matriculaInterna") ?? "").trim();
  const escalaTrabalho = String(formData.get("escalaTrabalho") ?? "");
  const cargaHorariaSemanalHoras = String(formData.get("cargaHorariaSemanalHoras") ?? "");
  const horarioEntradaBruta = String(formData.get("horarioEntrada") ?? "").trim();
  const horarioSaidaBruta = String(formData.get("horarioSaida") ?? "").trim();

  // Obrigatória pra CLT (pedido explícito do dono) — diferente de cargo,
  // que continua opcional (só é exigido na hora de gerar advertência).
  if (!matriculaInterna) return { erro: "Informe a matrícula interna — obrigatória pra funcionário CLT." };

  if (escalaTrabalho && !ESCALAS_VALIDAS.includes(escalaTrabalho as EscalaTrabalho)) {
    return { erro: "Escala de trabalho inválida." };
  }
  const escalaValida = escalaTrabalho ? (escalaTrabalho as EscalaTrabalho) : null;

  const escalaTurnoBruta = String(formData.get("escalaTurno") ?? "");
  const escalaTurno = escalaTurnoBruta === "NOITE" ? "NOITE" : null;

  const modoPausaOverrideBruta = String(formData.get("modoPausaOverride") ?? "");
  if (modoPausaOverrideBruta && !MODOS_PAUSA_VALIDOS.includes(modoPausaOverrideBruta as ModoPausa)) {
    return { erro: "Intervalo específico inválido." };
  }
  const modoPausaOverride = modoPausaOverrideBruta ? (modoPausaOverrideBruta as ModoPausa) : null;

  // Horário específico da pessoa: os dois campos juntos ou nenhum — não
  // faz sentido só entrada ou só saída (ver horarioEsperadoClt, que exige
  // o par completo pra sobrescrever o padrão da escala).
  let horarioEntradaMin: number | null = null;
  let horarioSaidaMin: number | null = null;
  if (horarioEntradaBruta || horarioSaidaBruta) {
    horarioEntradaMin = paraMinutosHorario(horarioEntradaBruta);
    horarioSaidaMin = paraMinutosHorario(horarioSaidaBruta);
    if (horarioEntradaMin === null || horarioSaidaMin === null) {
      return { erro: "Preencha entrada e saída do horário específico juntas (ou deixe as duas em branco)." };
    }
  }

  let salarioMensal: number | null = null;
  if (salarioBruto) {
    salarioMensal = Number(salarioBruto);
    if (!Number.isFinite(salarioMensal) || salarioMensal <= 0) {
      return { erro: "Informe um salário válido, ou deixe em branco." };
    }
  }

  let cargaHorariaSemanalMin: number | null = null;
  if (cargaHorariaSemanalHoras) {
    const horas = Number(cargaHorariaSemanalHoras.replace(",", "."));
    if (!Number.isFinite(horas) || horas <= 0) {
      return { erro: "Informe uma carga horária semanal válida, ou deixe em branco." };
    }
    cargaHorariaSemanalMin = Math.round(horas * 60);
  }

  const salarioAtual = vinculo.salarioMensal !== null ? Number(vinculo.salarioMensal) : null;
  const salarioMudou = salarioMensal !== salarioAtual;

  await prisma.$transaction(async (tx) => {
    await tx.vinculoPessoaEmpresa.update({
      where: { id: vinculo.id },
      data: {
        salarioMensal,
        cargo: cargo || null,
        matriculaInterna,
        escalaTrabalho: escalaValida,
        escalaTurno,
        cargaHorariaSemanalMin,
        horarioEntradaMin,
        horarioSaidaMin,
        modoPausaOverride,
      },
    });
    if (salarioMudou && salarioMensal !== null) {
      await tx.historicoSalarial.create({
        data: { vinculoId: vinculo.id, valor: salarioMensal, vigenteDesde: hojeData() },
      });
    }
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  return { sucesso: true };
}

export type DadosFuncionarioState = { erro?: string; sucesso?: boolean } | undefined;

/** Mesmo espírito de atualizarDadosPessoaAdmin (freelancers/actions.ts),
 * mas sem os campos de PIX — funcionário CLT não tem chave PIX cadastrada. */
export async function atualizarDadosFuncionario(
  _prev: DadosFuncionarioState,
  formData: FormData
): Promise<DadosFuncionarioState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  await vinculoCltDaEmpresa(pessoaId);

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const complemento = String(formData.get("complemento") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();
  const ctpsNumero = String(formData.get("ctpsNumero") ?? "").trim();
  const ctpsSerieUf = String(formData.get("ctpsSerieUf") ?? "").trim();
  const pisPasepNit = String(formData.get("pisPasepNit") ?? "").trim();
  const dataNascimentoBruta = String(formData.get("dataNascimento") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const contatoEmergenciaNome = String(formData.get("contatoEmergenciaNome") ?? "").trim();
  const contatoEmergenciaTelefone = String(formData.get("contatoEmergenciaTelefone") ?? "").trim();
  const chavePixBruta = String(formData.get("chavePix") ?? "");

  if (!nome) return { erro: "Informe o nome completo." };
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };
  // Obrigatório pra CLT (pedido explícito do dono) — diferente de CTPS,
  // que continua opcional (só é exigida na hora de gerar advertência).
  if (!pisPasepNit) return { erro: "Informe o PIS/PASEP/NIT — obrigatório pra funcionário CLT." };
  if (email && !email.includes("@")) return { erro: "Informe um e-mail válido, ou deixe em branco." };

  const dataNascimento = dataNascimentoBruta ? new Date(dataNascimentoBruta) : null;
  if (dataNascimento && Number.isNaN(dataNascimento.getTime())) {
    return { erro: "Informe uma data de nascimento válida, ou deixe em branco." };
  }

  const chavePixResultado = validarChavePixOpcional(chavePixBruta);
  if ("erro" in chavePixResultado) return chavePixResultado;

  await prisma.pessoa.update({
    where: { id: pessoaId },
    data: {
      nome,
      telefone,
      endereco,
      numero,
      complemento: complemento || null,
      email: email || null,
      rg: rg || null,
      ctpsNumero: ctpsNumero || null,
      ctpsSerieUf: ctpsSerieUf || null,
      pisPasepNit,
      chavePix: chavePixResultado.chavePix,
      tipoChavePix: chavePixResultado.tipoChavePix,
      dataNascimento,
      cep: cep || null,
      contatoEmergenciaNome: contatoEmergenciaNome || null,
      contatoEmergenciaTelefone: contatoEmergenciaTelefone || null,
    },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  revalidatePath("/funcionarios");
  return { sucesso: true };
}

export type CorrigirRegistroState = { erro?: string; sucesso?: boolean } | undefined;

/** O dono corrige manualmente um RegistroPonto que ninguém encerrou — seja
 * um `ABERTO` (o dono não precisa mais esperar o cron de meia-noite
 * marcar PENDENTE_CORRECAO pra poder agir, mesmo espírito do alerta de
 * "Em turno agora" no dashboard pros turnos de extra), um já sinalizado
 * `PENDENTE_CORRECAO`, ou um `CONCLUIDO` que já foi corrigido manualmente
 * antes (correcaoSaidaEm preenchido) e precisa ser ajustado de novo — só
 * NÃO permite corrigir quando a própria pessoa bateu a saída de verdade
 * (CONCLUIDO sem correcaoSaidaEm), que é a fonte de verdade do que
 * aconteceu. O sistema nunca inventa esse horário sozinho (ver
 * src/lib/fechamento-automatico.ts) — grava quem confirmou e quando em
 * correcaoSaidaEm/PorEmail (sempre a correção mais recente), pra
 * distinguir num relatório se foi a própria pessoa que bateu a saída ou a
 * empresa que encerrou/corrigiu na mão. */
export async function corrigirRegistroPonto(
  _prev: CorrigirRegistroState,
  formData: FormData
): Promise<CorrigirRegistroState> {
  const sessao = await requireModulo("funcionarios");
  const registroId = Number(formData.get("registroId"));
  const horaSaidaBruta = String(formData.get("horaSaida") ?? "");
  if (!Number.isInteger(registroId)) return { erro: "Registro inválido." };

  const registro = await prisma.registroPonto.findUnique({ where: { id: registroId } });
  if (!registro || registro.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Esse registro não pertence a esta empresa." };
  }
  const podeCorrigir =
    registro.status === "PENDENTE_CORRECAO" ||
    registro.status === "ABERTO" ||
    (registro.status === "CONCLUIDO" && registro.correcaoSaidaEm !== null);
  if (!podeCorrigir) {
    return {
      erro: "Esse registro foi encerrado pela própria pessoa — não é possível corrigir.",
    };
  }

  // new Date(horaSaidaBruta) interpretaria a string sem fuso ("YYYY-MM-
  // DDTHH:MM", que é o que <input type="datetime-local"> manda) como UTC
  // no servidor (Vercel roda em UTC) em vez de horário de Brasília — 3h de
  // diferença. Mesmo padrão seguro já usado em confirmarSaidaConflito
  // (src/app/turnos/actions.ts): parseia a string na mão e monta o
  // instante via instanteBrasil, que sempre assume Brasília.
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(horaSaidaBruta);
  if (!match) return { erro: "Informe um horário de saída válido." };
  const horaSaida = instanteBrasil(match[1], Number(match[2]) * 60 + Number(match[3]));
  if (horaSaida <= registro.horaEntrada) {
    return { erro: "O horário de saída precisa ser depois da entrada." };
  }

  const [vinculo, empresa] = await Promise.all([
    prisma.vinculoPessoaEmpresa.findUnique({
      where: { pessoaId_empresaId: { pessoaId: registro.pessoaId, empresaId: registro.empresaId } },
      select: { turnoPredefinido: true, modoPausaOverride: true },
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: registro.empresaId },
      select: {
        modoPausaCltDia: true,
        modoPausaCltNoite: true,
        horarioInicioDiaMin: true,
        horarioInicioNoiteMin: true,
      },
    }),
  ]);
  const tipoTurno = classificarTurno(
    registro.horaEntrada,
    vinculo?.turnoPredefinido ?? "LIVRE",
    empresa.horarioInicioDiaMin,
    empresa.horarioInicioNoiteMin
  );
  const modoPausaAplicavel = resolverModoPausaClt(vinculo?.modoPausaOverride ?? null, tipoTurno, empresa);
  const { minutosTrabalhados, minutosDescontadosPausa } = calcularMinutosPonto({
    horaEntrada: registro.horaEntrada,
    horaSaida,
    entradaIntervalo: registro.entradaIntervalo,
    saidaIntervalo: registro.saidaIntervalo,
    modoPausa: modoPausaAplicavel,
  });

  await prisma.registroPonto.update({
    where: { id: registro.id },
    data: {
      horaSaida,
      minutosTrabalhados,
      minutosDescontadosPausa,
      status: "CONCLUIDO",
      correcaoSaidaEm: new Date(),
      correcaoSaidaPorEmail: sessao.email,
    },
  });

  revalidatePath(`/funcionarios/${registro.pessoaId}`);
  revalidatePath("/dashboard");
  revalidatePath("/v2/dashboard");
  revalidatePath("/relatorios/horas");
  return { sucesso: true };
}

export type BeneficiosState = { erro?: string; sucesso?: boolean } | undefined;

/** Lê um par checkbox+valor do form: se o checkbox não veio marcado, o
 * valor grava null (mesmo desmarcado que o usuário tenha deixado algo
 * digitado no campo); se marcado, exige um valor > 0. */
function lerValorSeMarcado(
  formData: FormData,
  campoRecebe: string,
  campoValor: string
): { recebe: boolean; valor: number | null } | { erro: string } {
  const recebe = formData.get(campoRecebe) === "on";
  if (!recebe) return { recebe: false, valor: null };

  const bruto = String(formData.get(campoValor) ?? "").replace(",", ".");
  const valor = Number(bruto);
  if (!bruto || !Number.isFinite(valor) || valor <= 0) {
    return { erro: "Informe um valor válido pra cada adicional marcado, ou desmarque." };
  }
  return { recebe: true, valor };
}

/** Adicionais e benefícios CLT — todos valor livre em R$, informativos
 * (decisão explícita do dono: sem cálculo automático por percentual). A
 * bonificação fica marcada como não entrando na base de cálculo do
 * salário — hoje isso é só documentação, já que nenhum cálculo de
 * férias/13º/rescisão existe ainda, mas fica registrado separado desde
 * já. */
export async function atualizarBeneficios(
  _prev: BeneficiosState,
  formData: FormData
): Promise<BeneficiosState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);

  const insalubridade = lerValorSeMarcado(formData, "recebeInsalubridade", "valorInsalubridade");
  if ("erro" in insalubridade) return insalubridade;
  const periculosidade = lerValorSeMarcado(formData, "recebePericulosidade", "valorPericulosidade");
  if ("erro" in periculosidade) return periculosidade;
  const bonificacao = lerValorSeMarcado(formData, "recebeBonificacao", "valorBonificacao");
  if ("erro" in bonificacao) return bonificacao;
  const premioAssiduidade = lerValorSeMarcado(formData, "recebePremioAssiduidade", "valorPremioAssiduidade");
  if ("erro" in premioAssiduidade) return premioAssiduidade;

  // Transporte: a classificação legal (vale-transporte vs. ajuda de custo)
  // depende de descontar ou não os 6% em folha — não é uma escolha livre,
  // só faz sentido perguntar quando a pessoa recebe o benefício.
  const recebeTransporte = formData.get("recebeTransporte") === "on";
  let valorTransporte: number | null = null;
  let transporteComDesconto = false;
  if (recebeTransporte) {
    const bruto = String(formData.get("valorTransporte") ?? "").replace(",", ".");
    valorTransporte = Number(bruto);
    if (!bruto || !Number.isFinite(valorTransporte) || valorTransporte <= 0) {
      return { erro: "Informe um valor válido pro transporte, ou desmarque." };
    }
    transporteComDesconto = formData.get("transporteComDesconto") === "on";
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: {
      recebeInsalubridade: insalubridade.recebe,
      valorInsalubridade: insalubridade.valor,
      recebeTransporte,
      valorTransporte,
      transporteComDesconto,
      recebePericulosidade: periculosidade.recebe,
      valorPericulosidade: periculosidade.valor,
      recebeBonificacao: bonificacao.recebe,
      valorBonificacao: bonificacao.valor,
      recebePremioAssiduidade: premioAssiduidade.recebe,
      valorPremioAssiduidade: premioAssiduidade.valor,
    },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  return { sucesso: true };
}

export type AdmissaoState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarAdmissao(
  _prev: AdmissaoState,
  formData: FormData
): Promise<AdmissaoState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);

  const dataAdmissaoBruta = String(formData.get("dataAdmissao") ?? "").trim();
  const dataAdmissao = dataAdmissaoBruta ? instanteBrasil(dataAdmissaoBruta) : null;
  if (dataAdmissaoBruta && Number.isNaN(dataAdmissao?.getTime())) {
    return { erro: "Informe uma data de admissão válida, ou deixe em branco." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { dataAdmissao },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  return { sucesso: true };
}

export type FeriasGozadasState =
  | { erro?: undefined; sucesso: true; dataRetornoLabel: string }
  | { erro: string; sucesso?: undefined }
  | undefined;

/** Registra que a pessoa saiu de férias numa data por uma quantidade de
 * dias — reinicia a contagem do período aquisitivo/concessivo a partir
 * dali (ver src/lib/ferias.ts) e já devolve a data de retorno calculada
 * (início + quantidade de dias), pra avisar a empresa quando esperar a
 * pessoa de volta. */
export async function registrarFeriasGozadas(
  _prev: FeriasGozadasState,
  formData: FormData
): Promise<FeriasGozadasState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);

  if (!vinculo.dataAdmissao) {
    return { erro: "Informe a data de admissão antes de registrar férias." };
  }

  const dataBruta = String(formData.get("dataFerias") ?? "").trim();
  const dataFerias = dataBruta ? instanteBrasil(dataBruta) : hojeData();
  if (Number.isNaN(dataFerias.getTime())) {
    return { erro: "Informe uma data válida." };
  }

  const quantidadeDias = Number(formData.get("quantidadeDias"));
  if (!Number.isInteger(quantidadeDias) || quantidadeDias < 1 || quantidadeDias > 30) {
    return { erro: "Informe quantos dias de férias (entre 1 e 30)." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { ultimasFeriasGozadasEm: dataFerias, feriasQuantidadeDias: quantidadeDias },
  });

  const dataRetorno = new Date(dataFerias.getTime() + quantidadeDias * 24 * 60 * 60 * 1000);
  revalidatePath(`/funcionarios/${pessoaId}`);
  revalidatePath("/funcionarios");
  return {
    sucesso: true,
    dataRetornoLabel: dataRetorno.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
  };
}

export type ExperienciaState = { erro?: string; sucesso?: boolean } | undefined;

const LIMITE_TOTAL_EXPERIENCIA_DIAS = 90;

/** Configura as etapas do contrato de experiência (ex.: 30+60, 45+45) a
 * partir da dataAdmissao já cadastrada — o limite legal de 90 dias
 * somados é validado aqui pra evitar erro de digitação. */
export async function atualizarExperiencia(
  _prev: ExperienciaState,
  formData: FormData
): Promise<ExperienciaState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);

  if (!vinculo.dataAdmissao) {
    return { erro: "Informe a data de admissão antes de configurar o período de experiência." };
  }

  const dias1Bruto = String(formData.get("experienciaDias1") ?? "").trim();
  const dias2Bruto = String(formData.get("experienciaDias2") ?? "").trim();

  let dias1: number | null = null;
  if (dias1Bruto) {
    dias1 = Number(dias1Bruto);
    if (!Number.isInteger(dias1) || dias1 <= 0) {
      return { erro: "Informe um número de dias válido pra 1ª etapa, ou deixe em branco." };
    }
  }

  let dias2: number | null = null;
  if (dias2Bruto) {
    if (dias1 === null) {
      return { erro: "Informe a 1ª etapa antes da 2ª." };
    }
    dias2 = Number(dias2Bruto);
    if (!Number.isInteger(dias2) || dias2 <= 0) {
      return { erro: "Informe um número de dias válido pra 2ª etapa, ou deixe em branco." };
    }
  }

  if (dias1 !== null && dias1 + (dias2 ?? 0) > LIMITE_TOTAL_EXPERIENCIA_DIAS) {
    return { erro: `O período de experiência não pode passar de ${LIMITE_TOTAL_EXPERIENCIA_DIAS} dias no total.` };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { experienciaDias1: dias1, experienciaDias2: dias2 },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  return { sucesso: true };
}

export type MarcarEfetivadoState = { erro: string } | undefined;

/** Registra que o contrato de experiência foi efetivado (virou prazo
 * indeterminado) — encerra o aviso de vencimento pra essa pessoa. Chamada
 * direto pelo botão (sem <form>), por isso retorna { erro } em vez de
 * lançar exceção — ver o mesmo comentário em converterParaClt/Extra sobre
 * mensagens de throw ficarem redacted em produção nesse tipo de chamada. */
export async function marcarExperienciaEfetivada(pessoaId: number): Promise<MarcarEfetivadoState> {
  const sessao = await requireModulo("funcionarios");
  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") {
    return { erro: "Esse funcionário não pertence a esta empresa." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { experienciaEfetivadoEm: hojeData() },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  return undefined;
}

/** Confirma que a empresa decidiu prorrogar o contrato de experiência pro
 * 2º período — só a partir daqui o prazo da 2ª etapa passa a valer pro
 * aviso de vencimento (ver calcularStatusExperiencia, src/lib/experiencia.ts).
 * Sem isso, o aviso ficaria sempre em cima do prazo somado das duas
 * etapas, sem dar a empresa a chance de decidir de verdade no fim da 1ª. */
export async function marcarContinuarExperiencia(pessoaId: number): Promise<MarcarEfetivadoState> {
  const sessao = await requireModulo("funcionarios");
  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") {
    return { erro: "Esse funcionário não pertence a esta empresa." };
  }
  if (!vinculo.experienciaDias2) {
    return { erro: "Essa pessoa não tem uma 2ª etapa configurada no contrato de experiência." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { experienciaContinuouEm: hojeData() },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  return undefined;
}

export type RescisaoState = { erro?: string; sucesso?: boolean } | undefined;

/** Registra a rescisão do vínculo CLT (último dia de trabalho) — cobre
 * tanto "não efetivar" no período de experiência (rescisão numa data
 * igual ou antes do fim previsto, sem nunca ter marcado
 * experienciaEfetivadoEm) quanto a rescisão comum de quem já foi
 * efetivado. O prazo legal de pagamento/assinatura (ver
 * calcularPrazoLimiteRescisao em src/lib/rescisao.ts) é só exibido, não
 * gravado — é sempre derivado de dataRescisao, então recalcular na hora
 * de mostrar evita os dois ficarem dessincronizados se a data for
 * corrigida depois. Desativa o vínculo (mesmo campo `ativo` do toggle
 * manual em /funcionarios) pra a pessoa não conseguir mais bater ponto
 * aqui. */
export async function registrarRescisao(
  _prev: RescisaoState,
  formData: FormData
): Promise<RescisaoState> {
  const sessao = await requireModulo("funcionarios");
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);

  const dataBruta = String(formData.get("dataRescisao") ?? "").trim();
  if (!dataBruta) return { erro: "Informe a data da rescisão." };
  const dataRescisao = instanteBrasil(dataBruta);
  if (Number.isNaN(dataRescisao.getTime())) return { erro: "Informe uma data válida." };
  if (vinculo.dataAdmissao && dataRescisao < vinculo.dataAdmissao) {
    return { erro: "A data da rescisão não pode ser antes da admissão." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: {
      dataRescisao,
      rescisaoRegistradaEm: new Date(),
      rescisaoRegistradaPorEmail: sessao.email,
      ativo: false,
    },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  revalidatePath("/funcionarios");
  return { sucesso: true };
}

export type CancelarRescisaoState = { erro: string } | undefined;

/** Desfaz um registro de rescisão feito por engano — reativa o vínculo
 * (foi desativado automaticamente ao registrar). Chamada direto pelo
 * botão, sem <form>, por isso { erro } em vez de exceção. */
export async function cancelarRescisao(pessoaId: number): Promise<CancelarRescisaoState> {
  const sessao = await requireModulo("funcionarios");
  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo || vinculo.tipoVinculo !== "CLT") {
    return { erro: "Esse funcionário não pertence a esta empresa." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: {
      dataRescisao: null,
      rescisaoRegistradaEm: null,
      rescisaoRegistradaPorEmail: null,
      ativo: true,
    },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  revalidatePath("/funcionarios");
  return undefined;
}

export type ExtraDiarioState = { erro?: string; sucesso?: boolean } | undefined;

/** Liga/desliga, pra uma pessoa CLT, a opção de escolher no totem entre
 * bater ponto normal ou fazer um turno extra pago no dia (Opção A —
 * ver src/app/t/[token]/actions.ts::buscarPessoaPorDocumento). Quando
 * ligada, exige o mesmo modoPagamento/valorDiaria/frequenciaPagamento
 * usado pra extras de verdade — reaproveita as mesmas colunas do
 * vínculo que convertParaClt zera na conversão (src/app/freelancers/actions.ts),
 * que passam a ter uso de novo aqui. */
export async function atualizarExtraDiario(
  _prev: ExtraDiarioState,
  formData: FormData
): Promise<ExtraDiarioState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  const { vinculo } = await vinculoCltDaEmpresa(pessoaId);

  const permiteExtraDiario = formData.get("permiteExtraDiario") === "on";

  if (!permiteExtraDiario) {
    await prisma.vinculoPessoaEmpresa.update({
      where: { id: vinculo.id },
      data: { permiteExtraDiario: false },
    });
    revalidatePath(`/funcionarios/${pessoaId}`);
    return { sucesso: true };
  }

  // Chave PIX é obrigatória pra ligar essa opção — sem ela o totem nunca
  // oferece a pergunta "CLT ou extra" pra essa pessoa (ver condição em
  // buscarPessoaPorDocumento, src/app/t/[token]/actions.ts), então salvar
  // permiteExtraDiario=true sem PIX deixava a opção "ligada" no painel mas
  // invisível pra pessoa no tablet, sem nenhum aviso — confusão real que
  // já aconteceu.
  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: pessoaId },
    select: { chavePix: true, tipoChavePix: true },
  });
  if (pessoa.chavePix === null || pessoa.tipoChavePix === null) {
    return {
      erro:
        "Esta pessoa não tem chave PIX cadastrada — cadastre a chave PIX em \"Dados pessoais\" antes de habilitar o turno extra pago no dia.",
    };
  }

  const modoPagamento = String(formData.get("modoPagamento") ?? "");
  const frequenciaPagamento = String(formData.get("frequenciaPagamento") ?? "");
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

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { permiteExtraDiario: true, modoPagamento, valorDiaria, frequenciaPagamento },
  });

  revalidatePath(`/funcionarios/${pessoaId}`);
  return { sucesso: true };
}

export type CriarTurnoManualState =
  | { erro?: string; sucesso?: boolean; valorTotal?: number }
  | undefined;

function parseHoraParaMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Lança manualmente um turno extra pago pra uma pessoa CLT direto pelo
 * painel, sem passar pelo totem (Opção B) — pra quando o dono já sabe
 * exatamente o que aconteceu e não precisa esperar a pessoa passar num
 * totem de novo. Sem foto/assinatura (impossível sem totem): grava só o
 * registro administrativo (criadoManualmente/criadoManualmentePorEmail)
 * e entra no fluxo de pagamento normal, igual qualquer outro turno —
 * decisão confirmada com o dono, sem coleta de assinatura posterior. */
export async function criarTurnoManualClt(
  _prev: CriarTurnoManualState,
  formData: FormData
): Promise<CriarTurnoManualState> {
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Funcionário inválido." };
  const { sessao, vinculo } = await vinculoCltDaEmpresa(pessoaId);

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: pessoaId },
    select: { chavePix: true, tipoChavePix: true },
  });
  if (pessoa.chavePix === null || pessoa.tipoChavePix === null) {
    return {
      erro: "Esta pessoa não tem chave PIX cadastrada — complete o cadastro antes de lançar um turno extra.",
    };
  }

  const funcaoId = Number(formData.get("funcaoId"));
  if (!Number.isInteger(funcaoId)) return { erro: "Selecione uma função." };
  const funcao = await prisma.funcao.findUnique({ where: { id: funcaoId } });
  if (!funcao || funcao.empresaId !== sessao.empresaEfetivoId || !funcao.ativo) {
    return { erro: "Função inválida." };
  }

  const dataBruta = String(formData.get("data") ?? "").trim();
  const minutosEntrada = parseHoraParaMinutos(String(formData.get("horaEntrada") ?? "").trim());
  const minutosSaida = parseHoraParaMinutos(String(formData.get("horaSaida") ?? "").trim());
  if (!dataBruta || minutosEntrada === null || minutosSaida === null) {
    return { erro: "Informe data, hora de entrada e hora de saída válidas." };
  }

  const horaEntrada = instanteBrasil(dataBruta, minutosEntrada);
  let horaSaida = instanteBrasil(dataBruta, minutosSaida);
  // Saída antes ou igual à entrada só acontece quando o turno virou a
  // noite — soma um dia em vez de rejeitar (mesmo turno pode começar às
  // 22h e terminar às 6h do dia seguinte).
  if (horaSaida.getTime() <= horaEntrada.getTime()) {
    horaSaida = new Date(horaSaida.getTime() + 24 * 60 * 60 * 1000);
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: {
      modoPausaDia: true,
      modoPausaNoite: true,
      horarioInicioDiaMin: true,
      horarioInicioNoiteMin: true,
      diariaLimiarMeiaMin: true,
      diariaLimiarCompletaMin: true,
    },
  });

  const tipoTurno = classificarTurno(
    horaEntrada,
    vinculo.turnoPredefinido,
    empresa.horarioInicioDiaMin,
    empresa.horarioInicioNoiteMin
  );
  const modoPausaAplicavel = tipoTurno === "DIA" ? empresa.modoPausaDia : empresa.modoPausaNoite;

  const elapsedMs = horaSaida.getTime() - horaEntrada.getTime();
  const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } =
    calcularMinutosArredondados(elapsedMs, modoPausaAplicavel);
  const valorDiariaAplicada =
    vinculo.modoPagamento === "DIARIA" && vinculo.valorDiaria !== null
      ? Number(vinculo.valorDiaria)
      : null;
  const valorTotal = calcularValorTurno({
    modoPagamento: vinculo.modoPagamento,
    minutosArredondados,
    valorHoraAplicado: Number(funcao.valorHoraPadrao),
    valorDiariaAplicada,
    diariaLimiarMeiaMin: empresa.diariaLimiarMeiaMin,
    diariaLimiarCompletaMin: empresa.diariaLimiarCompletaMin,
  });

  const turno = await prisma.turno.create({
    data: {
      pessoaId,
      empresaId: sessao.empresaEfetivoId,
      funcaoId: funcao.id,
      valorHoraAplicado: funcao.valorHoraPadrao,
      modoPagamentoAplicado: vinculo.modoPagamento,
      valorDiariaAplicada,
      frequenciaPagamentoAplicada: vinculo.frequenciaPagamento,
      horaEntrada,
      horaSaida,
      minutosTrabalhados,
      minutosDescontadosPausa,
      minutosArredondados,
      valorTotal,
      status: "CONCLUIDO",
      criadoManualmente: true,
      criadoManualmentePorEmail: sessao.email,
    },
  });

  await processarPagamentoTurno(turno.id);

  revalidatePath("/turnos");
  revalidatePath("/pagamentos");
  revalidatePath("/relatorios");
  revalidatePath("/dashboard");
  revalidatePath("/v2/dashboard");
  revalidatePath(`/funcionarios/${pessoaId}`);

  return { sucesso: true, valorTotal };
}

export type ZerarPendentesState = { erro?: string; sucesso?: boolean } | undefined;

/** Dispensa manualmente os pagamentos de extra ainda pendentes de uma
 * pessoa NESTA empresa, até (e incluindo) uma data escolhida pelo dono —
 * pra quando esse valor já foi acertado por fora (ex.: pago em dinheiro
 * antes de formalizar a conversão pra CLT). Marca como CANCELADO em vez de
 * apagar ou zerar o valor: o registro do que foi trabalhado continua
 * existindo pra histórico/auditoria, só para de contar como pendente no
 * dashboard e em /pagamentos. Só mexe em pagamentos PENDENTE/FALHOU/
 * PROCESSANDO — nunca em algo que já foi CONCLUIDO. Não é exclusivo de
 * quem virou CLT: qualquer pessoa pode ter pagamentos de extra dispensados
 * assim, inclusive quem continua EXTRA e simplesmente foi acertado por
 * fora dessa vez. */
export async function zerarPagamentosExtraPendentes(
  pessoaId: number,
  dataLimite: string
): Promise<ZerarPendentesState> {
  const sessao = await requireModulo("funcionarios");

  const limite = instanteBrasil(dataLimite, 24 * 60);
  if (Number.isNaN(limite.getTime())) {
    return { erro: "Informe uma data válida." };
  }

  const { count } = await prisma.pagamento.updateMany({
    where: {
      status: { in: STATUS_PENDENTES },
      turno: {
        pessoaId,
        empresaId: sessao.empresaEfetivoId,
        horaEntrada: { lt: limite },
      },
    },
    data: { status: "CANCELADO" },
  });

  if (count === 0) {
    return { erro: "Nenhum pagamento pendente encontrado até essa data." };
  }

  revalidatePath(`/funcionarios/${pessoaId}`);
  revalidatePath(`/freelancers/${pessoaId}`);
  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/v2/dashboard");
  return { sucesso: true };
}

/** Salva a trava de horário de entrada por dia da semana pra esta pessoa
 * nesta empresa (ver src/lib/restricao-horario.ts) — vale tanto pra quem
 * é CLT quanto EXTRA, já que mora no vínculo. Sempre apaga e recria as
 * linhas do vínculo: mais simples que fazer diff dia a dia, e o volume é
 * baixo (no máximo 7 linhas). */
export async function atualizarRestricaoHorario(
  _prev: RestricaoHorarioState,
  formData: FormData
): Promise<RestricaoHorarioState> {
  const sessao = await requireModulo("funcionarios");
  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Pessoa inválida." };

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) return { erro: "Essa pessoa não pertence a esta empresa." };

  const restricoes = parseRestricoesFormData(formData);
  if ("erro" in restricoes) return restricoes;

  await prisma.$transaction([
    prisma.restricaoHorarioDia.deleteMany({ where: { vinculoId: vinculo.id } }),
    prisma.restricaoHorarioDia.createMany({
      data: restricoes.map((r) => ({ vinculoId: vinculo.id, ...r })),
    }),
  ]);

  revalidatePath(`/funcionarios/${pessoaId}`);
  revalidatePath(`/freelancers/${pessoaId}`);
  return { sucesso: true };
}
