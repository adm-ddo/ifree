"use server";

import { prisma } from "@/lib/prisma";
import { resolverTotemAtivo } from "@/lib/totem";
import {
  apenasDigitos,
  detectarTipoDocumento,
  documentoValido,
  chavePixValida,
} from "@/lib/documento";
import { uploadDataUrl } from "@/lib/blob";
import { calcularMinutosArredondados, calcularValorTurno } from "@/lib/turno";
import { processarPagamentoTurno } from "@/lib/pagamentos/processar";
import type { TipoChavePix } from "@/generated/prisma/enums";

type ResultadoErro = { erro: string };

export type DadosPessoa = {
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
};

export type ResultadoBusca =
  | ResultadoErro
  | { encontrada: false }
  | ({
      encontrada: true;
      pessoaId: number;
      pessoaNome: string;
      turnoAberto: null;
    } & DadosPessoa)
  | ({
      encontrada: true;
      pessoaId: number;
      pessoaNome: string;
      turnoAberto: {
        turnoId: number;
        funcaoNome: string;
        horaEntrada: string;
        valorHoraAplicado: number;
      };
    } & DadosPessoa);

export async function buscarPessoaPorDocumento(
  token: string,
  documentoBruto: string
): Promise<ResultadoBusca> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const tipoDocumento = detectarTipoDocumento(documentoBruto);
  if (!tipoDocumento || !documentoValido(tipoDocumento, documentoBruto)) {
    return { erro: "CPF ou CNPJ inválido." };
  }
  const documento = apenasDigitos(documentoBruto);

  const pessoa = await prisma.pessoa.findUnique({ where: { documento } });
  if (!pessoa) return { encontrada: false };

  const dadosPessoa: DadosPessoa = {
    telefone: pessoa.telefone,
    endereco: pessoa.endereco,
    numero: pessoa.numero ?? "",
    complemento: pessoa.complemento ?? "",
    chavePix: pessoa.chavePix,
    tipoChavePix: pessoa.tipoChavePix,
  };

  const turnoAberto = await prisma.turno.findFirst({
    where: { pessoaId: pessoa.id, empresaId: totem.empresaId, status: "ABERTO" },
    select: {
      id: true,
      horaEntrada: true,
      valorHoraAplicado: true,
      funcao: { select: { nome: true } },
    },
  });

  if (!turnoAberto) {
    return {
      encontrada: true,
      pessoaId: pessoa.id,
      pessoaNome: pessoa.nome,
      turnoAberto: null,
      ...dadosPessoa,
    };
  }

  return {
    encontrada: true,
    pessoaId: pessoa.id,
    pessoaNome: pessoa.nome,
    turnoAberto: {
      turnoId: turnoAberto.id,
      funcaoNome: turnoAberto.funcao.nome,
      horaEntrada: turnoAberto.horaEntrada.toISOString(),
      valorHoraAplicado: Number(turnoAberto.valorHoraAplicado),
    },
    ...dadosPessoa,
  };
}

export type ResultadoAtualizacao = ResultadoErro | { sucesso: true };

/** Deixa a própria pessoa corrigir telefone, endereço ou chave PIX no
 * totem — mesmo nível de confiança do resto do fluxo (quem digita o
 * documento já consegue bater entrada/saída por ela, então editar esses
 * campos não é um novo risco). Nome e documento não são editáveis por aqui. */
export async function atualizarDadosPessoa(
  token: string,
  dados: { pessoaId: number } & DadosPessoa
): Promise<ResultadoAtualizacao> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const telefone = dados.telefone.trim();
  const endereco = dados.endereco.trim();
  const numero = dados.numero.trim();
  const complemento = dados.complemento.trim();
  const chavePix = dados.chavePix.trim();
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };
  if (!chavePix) return { erro: "Informe a chave PIX." };
  if (!chavePixValida(dados.tipoChavePix, chavePix)) {
    return { erro: "A chave PIX não parece válida pro tipo selecionado." };
  }

  const pessoa = await prisma.pessoa.findUnique({ where: { id: dados.pessoaId } });
  if (!pessoa) return { erro: "Pessoa não encontrada." };

  await prisma.pessoa.update({
    where: { id: pessoa.id },
    data: {
      telefone,
      endereco,
      numero,
      complemento: complemento || null,
      chavePix,
      tipoChavePix: dados.tipoChavePix,
    },
  });

  return { sucesso: true };
}

export type ResultadoCadastro =
  | ResultadoErro
  | { pessoaId: number; pessoaNome: string };

export async function criarPessoa(
  token: string,
  dados: { nome: string; documento: string } & DadosPessoa
): Promise<ResultadoCadastro> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const nome = dados.nome.trim();
  const telefone = dados.telefone.trim();
  const endereco = dados.endereco.trim();
  const numero = dados.numero.trim();
  const complemento = dados.complemento.trim();
  const chavePix = dados.chavePix.trim();
  if (!nome) return { erro: "Informe o nome completo." };

  const tipoDocumento = detectarTipoDocumento(dados.documento);
  if (!tipoDocumento || !documentoValido(tipoDocumento, dados.documento)) {
    return { erro: "CPF ou CNPJ inválido." };
  }
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };
  if (!chavePix) return { erro: "Informe a chave PIX para receber o pagamento." };
  if (!chavePixValida(dados.tipoChavePix, chavePix)) {
    return { erro: "A chave PIX não parece válida pro tipo selecionado." };
  }

  const documento = apenasDigitos(dados.documento);

  const existente = await prisma.pessoa.findUnique({ where: { documento } });
  if (existente) {
    return {
      erro: "Esse CPF/CNPJ já está cadastrado. Volte e digite de novo.",
    };
  }

  const pessoa = await prisma.pessoa.create({
    data: {
      nome,
      documento,
      tipoDocumento,
      telefone,
      endereco,
      numero,
      complemento: complemento || null,
      chavePix,
      tipoChavePix: dados.tipoChavePix,
    },
  });
  return { pessoaId: pessoa.id, pessoaNome: pessoa.nome };
}

export type Funcao = { id: number; nome: string; valorHoraPadrao: number };

export type ResultadoInicioTurno = ResultadoErro | { turnoId: number };

export async function iniciarTurno(
  token: string,
  dados: {
    pessoaId: number;
    funcaoId: number;
    fotoDataUrl: string;
    assinaturaDataUrl: string;
  }
): Promise<ResultadoInicioTurno> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const funcao = await prisma.funcao.findUnique({ where: { id: dados.funcaoId } });
  if (!funcao || funcao.empresaId !== totem.empresaId || !funcao.ativo) {
    return { erro: "Função inválida." };
  }

  const pessoa = await prisma.pessoa.findUnique({ where: { id: dados.pessoaId } });
  if (!pessoa) return { erro: "Pessoa não encontrada." };

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId: pessoa.id, empresaId: totem.empresaId } },
  });
  if (vinculo && !vinculo.ativo) {
    return { erro: "Você está bloqueado(a) nesta empresa. Fale com o responsável." };
  }

  const turnoJaAberto = await prisma.turno.findFirst({
    where: { pessoaId: pessoa.id, empresaId: totem.empresaId, status: "ABERTO" },
  });
  if (turnoJaAberto) {
    return { erro: "Já existe um turno em aberto pra essa pessoa nesta empresa." };
  }

  const [fotoUrl, assinaturaUrl] = await Promise.all([
    uploadDataUrl(`turnos/foto-entrada-${Date.now()}.jpg`, dados.fotoDataUrl),
    uploadDataUrl(`turnos/assinatura-contrato-${Date.now()}.png`, dados.assinaturaDataUrl),
  ]);

  const turno = await prisma.$transaction(async (tx) => {
    await tx.vinculoPessoaEmpresa.upsert({
      where: {
        pessoaId_empresaId: { pessoaId: pessoa.id, empresaId: totem.empresaId },
      },
      update: {},
      create: { pessoaId: pessoa.id, empresaId: totem.empresaId },
    });

    return tx.turno.create({
      data: {
        pessoaId: pessoa.id,
        empresaId: totem.empresaId,
        totemId: totem.id,
        funcaoId: funcao.id,
        valorHoraAplicado: funcao.valorHoraPadrao,
        // snapshot do modo/frequência de pagamento do vínculo — não muda
        // retroativamente se o dono alterar depois desse check-in
        modoPagamentoAplicado: vinculo?.modoPagamento ?? "HORA",
        valorDiariaAplicada:
          vinculo?.modoPagamento === "DIARIA" ? vinculo.valorDiaria : null,
        frequenciaPagamentoAplicada: vinculo?.frequenciaPagamento ?? "DIARIA",
        horaEntrada: new Date(),
        fotoEntradaUrl: fotoUrl,
        assinaturaContratoUrl: assinaturaUrl,
        status: "ABERTO",
      },
    });
  });

  // Também guarda a foto mais recente no cadastro global, pra conferência
  // rápida na hora do CPF em visitas futuras.
  await prisma.pessoa.update({ where: { id: pessoa.id }, data: { fotoUrl } });

  return { turnoId: turno.id };
}

export type ResultadoConclusao =
  | ResultadoErro
  | { minutosTrabalhados: number; minutosArredondados: number; valorTotal: number };

export async function concluirTurno(
  token: string,
  dados: { turnoId: number; fotoDataUrl: string; assinaturaDataUrl: string }
): Promise<ResultadoConclusao> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const turno = await prisma.turno.findUnique({
    where: { id: dados.turnoId },
    include: {
      empresa: {
        select: { modoPausa: true, diariaLimiarMeiaMin: true, diariaLimiarCompletaMin: true },
      },
    },
  });
  if (!turno || turno.empresaId !== totem.empresaId || turno.status !== "ABERTO") {
    return { erro: "Turno inválido ou já encerrado." };
  }

  const horaSaida = new Date();
  const elapsedMs = horaSaida.getTime() - turno.horaEntrada.getTime();
  const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } =
    calcularMinutosArredondados(elapsedMs, turno.empresa.modoPausa);
  const valorTotal = calcularValorTurno({
    modoPagamento: turno.modoPagamentoAplicado,
    minutosArredondados,
    valorHoraAplicado: Number(turno.valorHoraAplicado),
    valorDiariaAplicada:
      turno.valorDiariaAplicada !== null ? Number(turno.valorDiariaAplicada) : null,
    diariaLimiarMeiaMin: turno.empresa.diariaLimiarMeiaMin,
    diariaLimiarCompletaMin: turno.empresa.diariaLimiarCompletaMin,
  });

  const [fotoUrl, assinaturaUrl] = await Promise.all([
    uploadDataUrl(`turnos/foto-saida-${Date.now()}.jpg`, dados.fotoDataUrl),
    uploadDataUrl(`turnos/assinatura-recibo-${Date.now()}.png`, dados.assinaturaDataUrl),
  ]);

  await prisma.turno.update({
    where: { id: turno.id },
    data: {
      horaSaida,
      minutosTrabalhados,
      minutosDescontadosPausa,
      minutosArredondados,
      valorTotal,
      fotoSaidaUrl: fotoUrl,
      assinaturaReciboUrl: assinaturaUrl,
      status: "CONCLUIDO",
    },
  });

  // Tenta o PIX na hora. Se falhar, o turno fica ERRO_PAGAMENTO e o admin
  // resolve depois em /pagamentos — a pessoa já assinou e pode ir embora,
  // não fica esperando o resultado do pagamento no totem.
  await processarPagamentoTurno(turno.id);

  return { minutosTrabalhados, minutosArredondados, valorTotal };
}
