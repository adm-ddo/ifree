"use server";

import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { resolverTotemAtivo } from "@/lib/totem";
import { gerarLinkQrDenuncia } from "@/lib/etica";
import {
  apenasDigitos,
  detectarTipoDocumento,
  documentoValido,
  chavePixValida,
} from "@/lib/documento";
import { uploadDataUrl } from "@/lib/blob";
import {
  calcularMinutosArredondados,
  calcularValorTurno,
  classificarTurno,
  classificarTurnoEntrada,
  calcularDesvioEntradaMin,
  LIMIAR_TOLERANCIA_ENTRADA_MIN,
} from "@/lib/turno";
import { LABEL_TURNO_PREDEFINIDO } from "@/lib/turnoPredefinido";
import { dataISOBrasil, dataISODoDbDate, formatarDataHora } from "@/lib/data";
import {
  calcularMinutosPonto,
  acoesPossiveisPonto,
  resolverModoPausaClt,
  trocaDeTurnoDetectada,
  type AcaoPonto,
} from "@/lib/ponto";
import { processarOuReterPagamentoTurno } from "@/lib/pagamentos/processar";
import { notaValida, tagsValidadas } from "@/lib/avaliacao";
import { verificarRestricaoEntrada } from "@/lib/restricao-horario";
import { comRetentativaDePool, comRetentativaDePoolOuErro } from "@/lib/retry";
import { enviarEmailHorarioEntradaIncomum } from "@/lib/email";
import type { TipoChavePix } from "@/generated/prisma/enums";

/** QR code de validade curta pro Canal de Ética, exibido no menu de
 * denúncia do totem — pra quem prefere continuar no próprio celular em
 * vez de usar o tablet compartilhado. Gerado sob demanda (sem nada salvo
 * no banco, ver gerarLinkQrDenuncia) e renovado sozinho pelo componente
 * cliente antes de vencer. */
export async function gerarQrCodeDenuncia(
  tokenDenuncia: string
): Promise<{ dataUrl: string; expiraEmISO: string }> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const { url, expiraEm } = gerarLinkQrDenuncia(tokenDenuncia, `${proto}://${host}`);

  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
  return { dataUrl, expiraEmISO: expiraEm.toISOString() };
}

type ResultadoErro = { erro: string };

export type DadosPessoa = {
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
};

/** Subconjunto editável no totem (ver atualizarDadosPessoa) — chave PIX
 * fica de fora de propósito: só dá pra mudar pelo próprio cadastro da
 * pessoa no iFREE Conecta (atualizarMeusDados em src/app/portal/actions.ts),
 * autenticado pela sessão dela, nunca digitando o CPF num totem. */
export type DadosContatoEditaveis = Omit<DadosPessoa, "chavePix" | "tipoChavePix">;

export type RegistroAbertoClt = {
  registroId: number;
  horaEntrada: string;
  entradaIntervalo: string | null;
  saidaIntervalo: string | null;
};

export type ResultadoBusca =
  | ResultadoErro
  | { encontrada: false }
  | ({
      encontrada: true;
      tipo: "EXTRA";
      pessoaId: number;
      pessoaNome: string;
      turnoAberto: null;
      ultimaFuncaoId: number | null;
      /** Pessoa tem turno/ponto aberto em OUTRA empresa, nunca encerrado —
       * ver comentário em buscarPessoaPorDocumento. Não identifica qual
       * empresa (privacidade entre clientes que não têm nada a ver um com
       * o outro) — só o horário, pra avisar a própria pessoa. */
      conflitoOutroLocal: { desde: string } | null;
      /** true quando a Pessoa não tem nem e-mail nem data de nascimento —
       * sem nenhum dos dois, ela fica sem segundo fator possível se um dia
       * digitar o CPF no totem de OUTRA empresa (ver
       * PRECISA_CONFIRMAR_IDENTIDADE/confirmarIdentidadeConecta), e cai
       * direto no vínculo bloqueado. Usado só pra destacar o botão
       * "editar dados" na tela de foto, convidando a completar agora. */
      perfilIncompleto: boolean;
    } & DadosPessoa)
  | ({
      encontrada: true;
      tipo: "EXTRA";
      pessoaId: number;
      pessoaNome: string;
      turnoAberto: {
        turnoId: number;
        funcaoNome: string;
        horaEntrada: string;
        valorHoraAplicado: number;
      };
    } & DadosPessoa)
  | {
      encontrada: true;
      tipo: "CLT";
      pessoaId: number;
      pessoaNome: string;
      registroAberto: RegistroAbertoClt | null;
      intervaloHabilitado: boolean;
    }
  | ({
      encontrada: true;
      /** CLT com permiteExtraDiario ligado, PIX cadastrado e sem turno
       * extra aberto — o totem pergunta se é ponto CLT normal ou um
       * extra pago hoje. Ver src/app/funcionarios/actions.ts::atualizarExtraDiario. */
      tipo: "CLT_OU_EXTRA";
      pessoaId: number;
      pessoaNome: string;
      registroAberto: RegistroAbertoClt | null;
      intervaloHabilitado: boolean;
      ultimaFuncaoId: number | null;
    } & DadosPessoa)
  | ({
      encontrada: true;
      /** CLT batendo ponto MUITO fora do horário esperado dela (ver
       * LIMIAR_TROCA_TURNO_MIN em src/lib/ponto.ts), sem nada aberto pra
       * fechar — o totem pergunta se é extra pago hoje ou troca do turno
       * oficial só hoje. Diferente de CLT_OU_EXTRA (que é um interruptor
       * sempre ligado, independente de horário): aqui a opção de trocar
       * turno SEMPRE aparece; extra pago só quando `podeExtra` (precisa
       * de permiteExtraDiario + PIX, mesma regra de CLT_OU_EXTRA). Sem
       * PIX, chavePix/tipoChavePix vêm null — só usados de verdade se
       * `podeExtra` for true. */
      tipo: "CLT_HORARIO_DIFERENTE";
      pessoaId: number;
      pessoaNome: string;
      intervaloHabilitado: boolean;
      ultimaFuncaoId: number | null;
      podeExtra: boolean;
    } & Omit<DadosPessoa, "chavePix" | "tipoChavePix"> & {
        chavePix: string | null;
        tipoChavePix: TipoChavePix | null;
      })
  | {
      encontrada: true;
      /** Pessoa já existe globalmente (cadastro do iFREE Conecta, feito em
       * outra empresa) mas NUNCA teve vínculo com ESTA empresa — em vez de
       * já devolver telefone/endereço/chave PIX dela (o que bastava saber
       * o CPF pra vazar esses dados, ver confirmarIdentidadeConecta), o
       * totem precisa pedir pra ela confirmar a própria chave PIX + um
       * segundo fator antes de liberar qualquer coisa. */
      tipo: "PRECISA_CONFIRMAR_IDENTIDADE";
      pessoaId: number;
      pessoaNome: string;
      segundoFator: "DATA_NASCIMENTO" | "EMAIL";
    };

/** Resultado de tentar confirmar identidade (chave PIX + segundo fator)
 * pra liberar o check-in de alguém que já tem cadastro global mas nunca
 * trabalhou nesta empresa — ver confirmarIdentidadeConecta. */
export type ResultadoConfirmacaoIdentidade =
  | ResultadoErro
  | ({
      sucesso: true;
      pessoaId: number;
      pessoaNome: string;
      ultimaFuncaoId: number | null;
      conflitoOutroLocal: { desde: string } | null;
      /** Ver comentário equivalente em ResultadoBusca["EXTRA" sem turno
       * aberto] — mesmo cálculo (email e dataNascimento ambos nulos). */
      perfilIncompleto: boolean;
    } & DadosPessoa);

/** Detecta se a pessoa já está com um turno de extra OU um ponto de CLT
 * aberto em OUTRA empresa (nunca encerrado) — pra avisar ela mesma antes
 * de abrir um novo turno aqui, sem revelar qual é a outra empresa (duas
 * empresas no iFREE não têm por que saber uma da vida da outra). Sem essa
 * checagem, alguém que esquece de bater saída num lugar simplesmente
 * "some" de lá e reaparece em outro, com os dois turnos correndo ao mesmo
 * tempo sem ninguém perceber na hora. */
async function buscarConflitoOutroLocal(
  pessoaId: number,
  empresaAtualId: number
): Promise<{ desde: string } | null> {
  const [outroTurno, outroRegistro] = await Promise.all([
    prisma.turno.findFirst({
      where: { pessoaId, empresaId: { not: empresaAtualId }, status: "ABERTO" },
      orderBy: { horaEntrada: "asc" },
      select: { horaEntrada: true },
    }),
    prisma.registroPonto.findFirst({
      where: { pessoaId, empresaId: { not: empresaAtualId }, status: "ABERTO" },
      orderBy: { horaEntrada: "asc" },
      select: { horaEntrada: true },
    }),
  ]);

  const candidatos = [outroTurno?.horaEntrada, outroRegistro?.horaEntrada].filter(
    (d): d is Date => d != null
  );
  if (candidatos.length === 0) return null;

  const maisAntigo = candidatos.reduce((a, b) => (a < b ? a : b));
  return { desde: maisAntigo.toISOString() };
}

/** Resolve o vínculo CLT aplicável nesta empresa — direto se existir,
 * senão tenta achar um vínculo CLT flutuante (VinculoPessoaEmpresa.
 * podeBaterPontoNoGrupo) numa empresa IRMÃ do mesmo grupo econômico (ver
 * Empresa.grupoEconomicoId). Usado por buscarPessoaPorDocumento e
 * baterPontoClt — quem chama sempre grava RegistroPonto/Turno com
 * `empresaId: totemEmpresaId` (a empresa física onde bateu), nunca a de
 * origem: só a escala/horário/restrições vêm do vínculo de origem, o
 * lugar de trabalho é sempre onde a pessoa está de verdade. Sem grupo
 * econômico configurado, devolve exatamente o que a busca direta achou —
 * comportamento idêntico a antes desta função existir. */
async function resolverVinculoCltComGrupo(pessoaId: number, totemEmpresaId: number) {
  const direto = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: totemEmpresaId } },
    include: { restricoesHorario: { select: { diaSemana: true, horaMinimaMin: true, horaMaximaMin: true } } },
  });
  if (direto?.tipoVinculo === "CLT") return direto;

  const empresaTotem = await prisma.empresa.findUnique({
    where: { id: totemEmpresaId },
    select: { grupoEconomicoId: true },
  });
  if (!empresaTotem?.grupoEconomicoId) return direto;

  const flutuante = await prisma.vinculoPessoaEmpresa.findFirst({
    where: {
      pessoaId,
      tipoVinculo: "CLT",
      ativo: true,
      podeBaterPontoNoGrupo: true,
      empresa: { grupoEconomicoId: empresaTotem.grupoEconomicoId },
    },
    include: { restricoesHorario: { select: { diaSemana: true, horaMinimaMin: true, horaMaximaMin: true } } },
  });
  return flutuante ?? direto;
}

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

  const vinculo = await resolverVinculoCltComGrupo(pessoa.id, totem.empresaId);

  // Turno extra em aberto tem prioridade sobre o ramo CLT — uma pessoa
  // CLT que optou por um extra (permiteExtraDiario) continua presa nesse
  // turno até bater a saída, independente do tipoVinculo dela. Por isso
  // essa busca acontece antes de ramificar por tipoVinculo (diferente de
  // antes, quando só existia dentro do ramo EXTRA).
  const turnoAberto = await prisma.turno.findFirst({
    where: { pessoaId: pessoa.id, empresaId: totem.empresaId, status: "ABERTO" },
    select: {
      id: true,
      horaEntrada: true,
      valorHoraAplicado: true,
      funcao: { select: { nome: true } },
    },
  });

  if (turnoAberto) {
    // Um turno só existe se a pessoa já tinha PIX cadastrado na hora do
    // check-in (seja pelo cadastro normal de extra, seja pela oferta de
    // CLT_OU_EXTRA abaixo, que só aparece com PIX presente) — nunca nulo
    // aqui.
    return {
      encontrada: true,
      tipo: "EXTRA",
      pessoaId: pessoa.id,
      pessoaNome: pessoa.nome,
      turnoAberto: {
        turnoId: turnoAberto.id,
        funcaoNome: turnoAberto.funcao.nome,
        horaEntrada: turnoAberto.horaEntrada.toISOString(),
        valorHoraAplicado: Number(turnoAberto.valorHoraAplicado),
      },
      telefone: pessoa.telefone,
      endereco: pessoa.endereco,
      numero: pessoa.numero ?? "",
      complemento: pessoa.complemento ?? "",
      chavePix: pessoa.chavePix!,
      tipoChavePix: pessoa.tipoChavePix!,
    };
  }

  if (vinculo?.tipoVinculo === "CLT") {
    if (!vinculo.ativo) return { erro: "Você está bloqueado(a) nesta empresa. Fale com o responsável." };

    const empresa = await prisma.empresa.findUniqueOrThrow({
      where: { id: totem.empresaId },
      select: {
        funcionariosBaterIntervalo: true,
        horarioEntrada5x2Min: true,
        horarioSaida5x2Min: true,
        horarioEntrada5x2NoiteMin: true,
        horarioSaida5x2NoiteMin: true,
        horarioEntrada6x1Min: true,
        horarioSaida6x1Min: true,
        horarioEntrada6x1NoiteMin: true,
        horarioSaida6x1NoiteMin: true,
        horarioEntrada12x36Min: true,
        horarioSaida12x36Min: true,
        horarioEntrada12x36NoiteMin: true,
        horarioSaida12x36NoiteMin: true,
      },
    });
    const registro = await prisma.registroPonto.findFirst({
      where: { pessoaId: pessoa.id, empresaId: totem.empresaId, status: "ABERTO" },
    });
    const registroAberto: RegistroAbertoClt | null = registro
      ? {
          registroId: registro.id,
          horaEntrada: registro.horaEntrada.toISOString(),
          entradaIntervalo: registro.entradaIntervalo?.toISOString() ?? null,
          saidaIntervalo: registro.saidaIntervalo?.toISOString() ?? null,
        }
      : null;

    // Só oferece qualquer uma das duas perguntas (extra pago / horário
    // diferente) se: (1) NÃO tiver ponto CLT aberto agora nesta empresa, e
    // (2) NÃO tiver turno/ponto aberto em outra empresa — nesses dois
    // casos a única ação possível é fechar o que já está aberto, nunca
    // abrir um segundo. Antes disso, oferecer a escolha mesmo com o ponto
    // já aberto foi exatamente o que causou o problema relatado pelo
    // Thiago em 2026-09-22 (duas funcionárias da DAM foram bater saída,
    // apareceu a pergunta "CLT normal ou extra?", e ao cair em "extra" o
    // ponto CLT ficou aberto pra sempre enquanto um turno extra novo era
    // criado).
    const conflitoOutroLocalClt = await buscarConflitoOutroLocal(pessoa.id, totem.empresaId);
    const podeAbrirNovoRegistro = registroAberto === null && conflitoOutroLocalClt === null;

    // Extra pago hoje exige PIX cadastrado (precisa de onde pagar) — sem
    // isso, mesmo com horário muito diferente, só resta a opção de trocar
    // o turno oficial (sem pagamento nenhum envolvido).
    const podeExtra =
      podeAbrirNovoRegistro &&
      vinculo.permiteExtraDiario &&
      pessoa.chavePix !== null &&
      pessoa.tipoChavePix !== null;

    // Bateu ponto MUITO fora do horário esperado dela (ver
    // LIMIAR_TROCA_TURNO_MIN em src/lib/ponto.ts) — pergunta se é extra
    // pago ou troca do turno oficial só hoje, em vez de deixar seguir
    // pro ponto normal (que compararia contra o horário de sempre dela e
    // gerar um desvio gigante sem sentido, ver Luis Alberto Bolivar Diaz
    // em setembro/2026).
    if (podeAbrirNovoRegistro && trocaDeTurnoDetectada(new Date(), vinculo, empresa)) {
      const ultimoTurno = await prisma.turno.findFirst({
        where: { pessoaId: pessoa.id, empresaId: totem.empresaId },
        orderBy: { horaEntrada: "desc" },
        select: { funcaoId: true },
      });

      return {
        encontrada: true,
        tipo: "CLT_HORARIO_DIFERENTE",
        pessoaId: pessoa.id,
        pessoaNome: pessoa.nome,
        intervaloHabilitado: empresa.funcionariosBaterIntervalo,
        ultimaFuncaoId: ultimoTurno?.funcaoId ?? null,
        podeExtra,
        telefone: pessoa.telefone,
        endereco: pessoa.endereco,
        numero: pessoa.numero ?? "",
        complemento: pessoa.complemento ?? "",
        chavePix: pessoa.chavePix,
        tipoChavePix: pessoa.tipoChavePix,
      };
    }

    if (podeExtra) {
      const ultimoTurno = await prisma.turno.findFirst({
        where: { pessoaId: pessoa.id, empresaId: totem.empresaId },
        orderBy: { horaEntrada: "desc" },
        select: { funcaoId: true },
      });

      return {
        encontrada: true,
        tipo: "CLT_OU_EXTRA",
        pessoaId: pessoa.id,
        pessoaNome: pessoa.nome,
        registroAberto,
        intervaloHabilitado: empresa.funcionariosBaterIntervalo,
        ultimaFuncaoId: ultimoTurno?.funcaoId ?? null,
        telefone: pessoa.telefone,
        endereco: pessoa.endereco,
        numero: pessoa.numero ?? "",
        complemento: pessoa.complemento ?? "",
        chavePix: pessoa.chavePix!,
        tipoChavePix: pessoa.tipoChavePix!,
      };
    }

    return {
      encontrada: true,
      tipo: "CLT",
      pessoaId: pessoa.id,
      pessoaNome: pessoa.nome,
      registroAberto,
      intervaloHabilitado: empresa.funcionariosBaterIntervalo,
    };
  }

  // Só acontece se a pessoa foi cadastrada como CLT em outra empresa e
  // agora está tentando trabalhar como extra aqui, sem nunca ter informado
  // uma chave PIX — não dá pra seguir o fluxo de extra (que depende de PIX
  // pra pagar) nem cair no cadastro normal (o CPF já existe, criarPessoa
  // rejeitaria). Caso raro o suficiente pra não merecer uma tela nova;
  // resolve na mão com o responsável por enquanto.
  if (pessoa.chavePix === null || pessoa.tipoChavePix === null) {
    return {
      erro:
        "Seu cadastro está incompleto (falta chave PIX). Peça pro responsável completar seu cadastro nesta empresa.",
    };
  }

  if (!vinculo) {
    // Pessoa existe globalmente (cadastro feito em OUTRA empresa via
    // iFREE Conecta) mas nunca teve vínculo com ESTA empresa — não dá pra
    // simplesmente devolver telefone/endereço/chave PIX dela aqui: bastaria
    // saber o CPF de alguém, em qualquer totem (self-service em /totens),
    // pra vazar esses dados. Em vez disso pede confirmação de identidade
    // (ver confirmarIdentidadeConecta) antes de liberar qualquer coisa.
    if (pessoa.dataNascimento === null && pessoa.email === null) {
      // Sem data de nascimento NEM e-mail cadastrados, não tem segundo
      // fator nenhum pra confirmar com segurança — cria o vínculo já
      // bloqueado (mesmo estado final de 3 tentativas erradas, ver
      // confirmarIdentidadeConecta) em vez de deixar a pessoa presa num
      // fluxo sem saída possível.
      await prisma.vinculoPessoaEmpresa.create({
        data: { pessoaId: pessoa.id, empresaId: totem.empresaId, tipoVinculo: "EXTRA", ativo: false },
      });
      return {
        erro:
          "Seu cadastro está incompleto (falta data de nascimento ou e-mail). Fale com o responsável desta empresa pra liberar seu acesso.",
      };
    }
    return {
      encontrada: true,
      tipo: "PRECISA_CONFIRMAR_IDENTIDADE",
      pessoaId: pessoa.id,
      pessoaNome: pessoa.nome,
      segundoFator: pessoa.dataNascimento !== null ? "DATA_NASCIMENTO" : "EMAIL",
    };
  }

  const dadosPessoa: DadosPessoa = {
    telefone: pessoa.telefone,
    endereco: pessoa.endereco,
    numero: pessoa.numero ?? "",
    complemento: pessoa.complemento ?? "",
    chavePix: pessoa.chavePix,
    tipoChavePix: pessoa.tipoChavePix,
  };

  // Chegou até aqui: EXTRA que já tem vínculo com esta empresa (voltando
  // pra um novo turno), sem turno aberto agora — check-in normal. Última
  // função que essa pessoa exerceu nesta empresa só serve pra pré-sugerir
  // na tela de escolha (ver funcao step), nunca decide nada sozinha; se a
  // função não existir mais ou estiver desativada, a tela simplesmente
  // ignora a sugestão e mostra a lista normal.
  const ultimoTurno = await prisma.turno.findFirst({
    where: { pessoaId: pessoa.id, empresaId: totem.empresaId },
    orderBy: { horaEntrada: "desc" },
    select: { funcaoId: true },
  });

  const conflitoOutroLocal = await buscarConflitoOutroLocal(pessoa.id, totem.empresaId);

  return {
    encontrada: true,
    tipo: "EXTRA",
    pessoaId: pessoa.id,
    pessoaNome: pessoa.nome,
    turnoAberto: null,
    ultimaFuncaoId: ultimoTurno?.funcaoId ?? null,
    conflitoOutroLocal,
    perfilIncompleto: pessoa.email === null && pessoa.dataNascimento === null,
    ...dadosPessoa,
  };
}

/** Confirma identidade (chave PIX + segundo fator) de alguém que já tem
 * cadastro global no iFREE Conecta mas nunca teve vínculo com esta
 * empresa — ver ResultadoBusca["PRECISA_CONFIRMAR_IDENTIDADE"] e o
 * comentário em TentativaConfirmacaoIdentidade (schema.prisma). Errar 3x
 * bloqueia o vínculo (`ativo: false`) — só o responsável da empresa
 * reativa depois (botão em /freelancers). */
export async function confirmarIdentidadeConecta(
  token: string,
  pessoaId: number,
  chavePixDigitada: string,
  segundoFatorDigitado: string
): Promise<ResultadoConfirmacaoIdentidade> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const pessoa = await prisma.pessoa.findUnique({ where: { id: pessoaId } });
  if (!pessoa) return { erro: "Pessoa não encontrada." };

  // Esse fluxo só existe pra quem ainda não tem vínculo com esta empresa
  // — se já existe (ex.: outra aba já confirmou, ou tentativa de reuso
  // fora do fluxo normal), não há nada a confirmar aqui.
  const vinculoExistente = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: totem.empresaId } },
  });
  if (vinculoExistente) {
    return { erro: "Pessoa não encontrada." };
  }

  const pixConfere =
    pessoa.chavePix !== null && chavePixDigitada.trim().toLowerCase() === pessoa.chavePix.trim().toLowerCase();

  let segundoFatorConfere: boolean;
  if (pessoa.dataNascimento !== null) {
    segundoFatorConfere = segundoFatorDigitado.trim() === pessoa.dataNascimento.toISOString().slice(0, 10);
  } else if (pessoa.email !== null) {
    segundoFatorConfere = segundoFatorDigitado.trim().toLowerCase() === pessoa.email.trim().toLowerCase();
  } else {
    segundoFatorConfere = false;
  }

  if (pixConfere && segundoFatorConfere) {
    await prisma.tentativaConfirmacaoIdentidade.deleteMany({ where: { pessoaId, empresaId: totem.empresaId } });

    const ultimoTurno = await prisma.turno.findFirst({
      where: { pessoaId, empresaId: totem.empresaId },
      orderBy: { horaEntrada: "desc" },
      select: { funcaoId: true },
    });
    const conflitoOutroLocal = await buscarConflitoOutroLocal(pessoaId, totem.empresaId);

    return {
      sucesso: true,
      pessoaId,
      pessoaNome: pessoa.nome,
      ultimaFuncaoId: ultimoTurno?.funcaoId ?? null,
      conflitoOutroLocal,
      perfilIncompleto: pessoa.email === null && pessoa.dataNascimento === null,
      telefone: pessoa.telefone,
      endereco: pessoa.endereco,
      numero: pessoa.numero ?? "",
      complemento: pessoa.complemento ?? "",
      chavePix: pessoa.chavePix!,
      tipoChavePix: pessoa.tipoChavePix!,
    };
  }

  const tentativa = await prisma.tentativaConfirmacaoIdentidade.upsert({
    where: { pessoaId_empresaId: { pessoaId, empresaId: totem.empresaId } },
    create: { pessoaId, empresaId: totem.empresaId, tentativas: 1 },
    update: { tentativas: { increment: 1 } },
  });

  if (tentativa.tentativas >= 3) {
    await comRetentativaDePool(() =>
      prisma.$transaction([
        prisma.vinculoPessoaEmpresa.create({
          data: { pessoaId, empresaId: totem.empresaId, tipoVinculo: "EXTRA", ativo: false },
        }),
        prisma.tentativaConfirmacaoIdentidade.delete({ where: { id: tentativa.id } }),
      ])
    );
    return {
      erro: "Dados não conferem — cadastro bloqueado nesta empresa após muitas tentativas. Fale com o responsável.",
    };
  }

  return {
    erro: `Dados não conferem. Restam ${3 - tentativa.tentativas} tentativa(s).`,
  };
}

export type ResultadoPontoClt = ResultadoErro | { sucesso: true; acao: AcaoPonto };

/** Bate ponto de funcionário CLT — entrada, saída de intervalo, volta do
 * intervalo ou saída final, dependendo de `acao`. Nunca confia na `acao`
 * que o cliente mandou: recalcula server-side quais ações são legais dado
 * o estado atual do RegistroPonto (mesmo padrão defensivo de iniciarTurno/
 * concluirTurno) e rejeita se não bater — evita, por exemplo, duas abas do
 * totem tentando bater a mesma entrada duas vezes. */
export async function baterPontoClt(
  token: string,
  dados: {
    pessoaId: number;
    fotoDataUrl: string;
    acao: AcaoPonto;
    /// true quando a pessoa confirmou, na pergunta de horário diferente
    /// (ver buscarPessoaPorDocumento), que está trocando o turno oficial
    /// só hoje — só importa na ENTRADA (abre um RegistroPonto novo); as
    /// outras ações operam sobre um registro que já existe.
    trocaTurnoOficialHoje?: boolean;
  }
): Promise<ResultadoPontoClt> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const vinculo = await resolverVinculoCltComGrupo(dados.pessoaId, totem.empresaId);
  if (!vinculo || vinculo.tipoVinculo !== "CLT") return { erro: "Funcionário inválido." };
  if (!vinculo.ativo) return { erro: "Você está bloqueado(a) nesta empresa. Fale com o responsável." };
  if (dados.acao === "ENTRADA") {
    const restricao = verificarRestricaoEntrada(vinculo.restricoesHorario, new Date());
    if (restricao.bloqueado) return { erro: restricao.mensagem };
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: totem.empresaId },
    select: {
      funcionariosBaterIntervalo: true,
      modoPausaCltDia: true,
      modoPausaCltNoite: true,
      horarioInicioDiaMin: true,
      horarioInicioNoiteMin: true,
    },
  });
  const registro = await prisma.registroPonto.findFirst({
    where: { pessoaId: dados.pessoaId, empresaId: totem.empresaId, status: "ABERTO" },
  });

  const acoesLegais = acoesPossiveisPonto(registro, empresa.funcionariosBaterIntervalo);
  if (!acoesLegais.includes(dados.acao)) {
    return { erro: "Essa ação não está mais disponível — atualize a página e tente de novo." };
  }

  const agora = new Date();

  if (dados.acao === "ENTRADA") {
    const fotoEntradaUrl = await uploadDataUrl(`pontos/foto-entrada-${Date.now()}.jpg`, dados.fotoDataUrl);
    const resultado = await comRetentativaDePoolOuErro(() =>
      prisma.registroPonto.create({
        data: {
          pessoaId: dados.pessoaId,
          empresaId: totem.empresaId,
          totemId: totem.id,
          horaEntrada: agora,
          fotoEntradaUrl,
          trocaTurnoOficialHoje: dados.trocaTurnoOficialHoje ?? false,
        },
      })
    );
    if ("erro" in resultado) return resultado;
    return { sucesso: true, acao: "ENTRADA" };
  }

  // As outras três ações sempre operam sobre o registro aberto já
  // encontrado — acoesPossiveisPonto só devolve essas ações quando ele
  // existe, mas o TypeScript não sabe disso, então a checagem abaixo é
  // tanto defesa em profundidade quanto narrowing de tipo.
  if (!registro) return { erro: "Nenhum ponto em aberto encontrado." };

  if (dados.acao === "SAIDA_INTERVALO") {
    const fotoEntradaIntervaloUrl = await uploadDataUrl(
      `pontos/foto-intervalo-inicio-${Date.now()}.jpg`,
      dados.fotoDataUrl
    );
    const resultado = await comRetentativaDePoolOuErro(() =>
      prisma.registroPonto.update({
        where: { id: registro.id },
        data: { entradaIntervalo: agora, fotoEntradaIntervaloUrl },
      })
    );
    if ("erro" in resultado) return resultado;
    return { sucesso: true, acao: "SAIDA_INTERVALO" };
  }

  if (dados.acao === "VOLTA_INTERVALO") {
    const fotoSaidaIntervaloUrl = await uploadDataUrl(
      `pontos/foto-intervalo-fim-${Date.now()}.jpg`,
      dados.fotoDataUrl
    );
    const resultado = await comRetentativaDePoolOuErro(() =>
      prisma.registroPonto.update({
        where: { id: registro.id },
        data: { saidaIntervalo: agora, fotoSaidaIntervaloUrl },
      })
    );
    if ("erro" in resultado) return resultado;
    return { sucesso: true, acao: "VOLTA_INTERVALO" };
  }

  // SAIDA_FINAL
  const fotoSaidaUrl = await uploadDataUrl(`pontos/foto-saida-${Date.now()}.jpg`, dados.fotoDataUrl);
  const tipoTurno = classificarTurno(
    registro.horaEntrada,
    vinculo.turnoPredefinido,
    empresa.horarioInicioDiaMin,
    empresa.horarioInicioNoiteMin
  );
  const modoPausaAplicavel = resolverModoPausaClt(vinculo.modoPausaOverride, tipoTurno, empresa);
  const { minutosTrabalhados, minutosDescontadosPausa } = calcularMinutosPonto({
    horaEntrada: registro.horaEntrada,
    horaSaida: agora,
    entradaIntervalo: registro.entradaIntervalo,
    saidaIntervalo: registro.saidaIntervalo,
    modoPausa: modoPausaAplicavel,
  });
  const resultado = await comRetentativaDePoolOuErro(() =>
    prisma.registroPonto.update({
      where: { id: registro.id },
      data: {
        horaSaida: agora,
        minutosTrabalhados,
        minutosDescontadosPausa,
        fotoSaidaUrl,
        status: "CONCLUIDO",
      },
    })
  );
  if ("erro" in resultado) return resultado;
  return { sucesso: true, acao: "SAIDA_FINAL" };
}

export type ResultadoAtualizacao = ResultadoErro | { sucesso: true };

/** Deixa a própria pessoa corrigir telefone e endereço no totem — chave
 * PIX fica de fora de propósito (ver DadosContatoEditaveis). IMPORTANTE:
 * exige vínculo ativo da pessoa com a empresa DESTE totem antes de aceitar
 * qualquer alteração — Pessoa é uma entidade global (compartilhada entre
 * todas as empresas via iFREE Conecta), então sem essa checagem qualquer
 * um com totem próprio (self-service em /totens) e o CPF de outra pessoa
 * conseguiria sobrescrever os dados dela — mesmo padrão de checagem já
 * usado em baterPontoClt/iniciarTurno acima (`vinculoPessoaEmpresa.findUnique`
 * por pessoaId+empresaId do totem). Nome e documento não são editáveis por
 * aqui.
 *
 * `email`/`dataNascimento` são um caso à parte: só entram aqui pra
 * PREENCHER pela primeira vez (perfilIncompleto, ver ResultadoBusca) —
 * nunca pra SOBRESCREVER um valor que já existe. Isso evita reabrir, pelo
 * totem, o mesmo risco de sequestro de conta que já motivou excluir chave
 * PIX daqui: se a pessoa já tem e-mail cadastrado, mudá-lo só é permitido
 * autenticado no Portal (ver solicitarTrocaEmail em src/app/portal/actions.ts),
 * nunca digitando um CPF num totem. */
export async function atualizarDadosPessoa(
  token: string,
  dados: { pessoaId: number; email?: string; dataNascimento?: string } & DadosContatoEditaveis
): Promise<ResultadoAtualizacao> {
  const totem = await resolverTotemAtivo(token);
  if (!totem) return { erro: "Totem inválido ou desativado." };

  const telefone = dados.telefone.trim();
  const endereco = dados.endereco.trim();
  const numero = dados.numero.trim();
  const complemento = dados.complemento.trim();
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };

  const pessoa = await prisma.pessoa.findUnique({ where: { id: dados.pessoaId } });
  if (!pessoa) return { erro: "Pessoa não encontrada." };

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId: pessoa.id, empresaId: totem.empresaId } },
  });
  if (!vinculo) return { erro: "Pessoa não encontrada." };
  if (!vinculo.ativo) return { erro: "Você está bloqueado(a) nesta empresa. Fale com o responsável." };

  // Só preenche o que ainda está vazio — nunca sobrescreve (ver docblock).
  let email: string | undefined;
  if (pessoa.email === null && dados.email?.trim()) {
    const emailNovo = dados.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailNovo)) return { erro: "O e-mail informado não parece válido." };
    email = emailNovo;
  }
  let dataNascimento: Date | undefined;
  if (pessoa.dataNascimento === null && dados.dataNascimento?.trim()) {
    const data = new Date(`${dados.dataNascimento.trim()}T00:00:00Z`);
    if (Number.isNaN(data.getTime())) return { erro: "A data de nascimento informada não parece válida." };
    dataNascimento = data;
  }

  await prisma.pessoa.update({
    where: { id: pessoa.id },
    data: {
      telefone,
      endereco,
      numero,
      complemento: complemento || null,
      ...(email !== undefined ? { email } : {}),
      ...(dataNascimento !== undefined ? { dataNascimento } : {}),
    },
  });

  return { sucesso: true };
}

export type ResultadoCadastro =
  | ResultadoErro
  | { pessoaId: number; pessoaNome: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function criarPessoa(
  token: string,
  dados: { nome: string; documento: string; email?: string; dataNascimento?: string } & DadosPessoa
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

  // E-mail e data de nascimento são opcionais aqui (não travar o cadastro
  // no totem por causa deles), mas pelo menos um dos dois evita que essa
  // pessoa fique sem segundo fator se um dia digitar o CPF no totem de
  // OUTRA empresa (ver PRECISA_CONFIRMAR_IDENTIDADE) — por isso o form já
  // incentiva preencher, mesmo sem obrigar.
  const email = dados.email?.trim().toLowerCase() || null;
  if (email && !EMAIL_REGEX.test(email)) {
    return { erro: "O e-mail informado não parece válido." };
  }
  const dataNascimentoBruta = dados.dataNascimento?.trim() || null;
  const dataNascimento = dataNascimentoBruta ? new Date(`${dataNascimentoBruta}T00:00:00Z`) : null;
  if (dataNascimentoBruta && Number.isNaN(dataNascimento?.getTime())) {
    return { erro: "A data de nascimento informada não parece válida." };
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
      email,
      dataNascimento,
    },
  });
  return { pessoaId: pessoa.id, pessoaNome: pessoa.nome };
}

export type Funcao = { id: number; nome: string; valorHoraPadrao: number };

export type ResultadoInicioTurno =
  | ResultadoErro
  | { precisaConfirmarHorario: string }
  | { turnoId: number };

export async function iniciarTurno(
  token: string,
  dados: {
    pessoaId: number;
    funcaoId: number;
    fotoDataUrl: string;
    assinaturaDataUrl: string;
    /// true quando a pessoa já viu o aviso de horário incomum
    /// (precisaConfirmarHorario abaixo) e confirmou que quer mesmo
    /// iniciar agora — evita perguntar nessa mesma chamada de novo.
    confirmarHorarioIncomum?: boolean;
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
    include: { restricoesHorario: { select: { diaSemana: true, horaMinimaMin: true, horaMaximaMin: true } } },
  });
  if (vinculo && !vinculo.ativo) {
    return { erro: "Você está bloqueado(a) nesta empresa. Fale com o responsável." };
  }
  if (vinculo?.bloqueadoSuspeitaFraudeEm) {
    return {
      erro: "Você está temporariamente bloqueado(a) por suspeita de horário incomum. Fale com o responsável pra liberar de novo.",
    };
  }
  // Nunca confia que o cliente só chegou aqui pela tela cltOuExtra — uma
  // pessoa CLT só pode abrir um turno extra se o dono ligou
  // permiteExtraDiario pra ela (mesmo padrão defensivo de baterPontoClt).
  if (vinculo?.tipoVinculo === "CLT" && !vinculo.permiteExtraDiario) {
    return { erro: "Esta pessoa é CLT e não está habilitada a fazer turnos extras." };
  }
  if (vinculo) {
    const restricao = verificarRestricaoEntrada(vinculo.restricoesHorario, new Date());
    if (restricao.bloqueado) return { erro: restricao.mensagem };
  }

  // Checagem de horário incomum na entrada — só quando a pessoa tem turno
  // fixo definido (turnoPredefinido != LIVRE, que é o padrão de todo
  // mundo). Primeira entrada de cada turno semeia turnosPermitidosEntrada
  // sozinha, sem checar nada; dali em diante, bater entrada DENTRO da
  // lista mas passado LIMIAR_TOLERANCIA_ENTRADA_MIN pede confirmação
  // explícita antes de seguir. Pedido do Thiago em 2026-09-28, junto com
  // Turno.pagamentoRetidoRevisao — linha de defesa ANTES do turno
  // começar. Fica ANTES do upload de foto/assinatura de propósito: se
  // precisar pedir confirmação, não desperdiça upload numa chamada que
  // ainda vai repetir.
  //
  // Bater entrada FORA da lista de permitidos NÃO bloqueia mais (bloqueava
  // até 2026-09-30) — o caso real da Viviane, na P&D, mostrou o problema:
  // ela sempre bate ponto perto de 15h40, o corte exato configurado da
  // empresa entre "Manhã" e "Tarde/noite" é justamente 15h40, e bater 2
  // minutos ANTES (15h38) já cai na categoria "errada" e travava o acesso
  // dela por completo, exigindo o dono liberar manualmente — sem nenhuma
  // margem pra variação normal de horário. Decisão do Thiago: nunca
  // bloquear por causa disso, só deixar entrar normal e avisar a empresa
  // por e-mail que foi um horário fora do padrão, pra ela decidir se tá
  // tudo bem (sem exigir nenhuma ação pra continuar).
  const agora = new Date();
  if (vinculo && vinculo.turnoPredefinido !== "LIVRE") {
    const empresaHorariosEntrada = await prisma.empresa.findUnique({
      where: { id: totem.empresaId },
      select: { horarioInicioMadrugadaMin: true, horarioInicioDiaMin: true, horarioInicioNoiteMin: true },
    });
    if (empresaHorariosEntrada) {
      const categoriaEntrada = classificarTurnoEntrada(agora, empresaHorariosEntrada);
      const permitidos = vinculo.turnosPermitidosEntrada;

      if (!permitidos.includes(categoriaEntrada)) {
        // Não é a primeira entrada de todas (permitidos vazio) => já
        // tinha um padrão estabelecido, então isso É uma novidade digna
        // de avisar a empresa — mas sem bloquear ninguém.
        const jaTinhaPadrao = permitidos.length > 0;
        await prisma.vinculoPessoaEmpresa.update({
          where: { pessoaId_empresaId: { pessoaId: pessoa.id, empresaId: totem.empresaId } },
          data: { turnosPermitidosEntrada: { push: categoriaEntrada } },
        });
        if (jaTinhaPadrao) {
          const motivo = `Bateu entrada às ${formatarDataHora(agora)} (turno ${LABEL_TURNO_PREDEFINIDO[categoriaEntrada]}), fora do padrão até então (${permitidos.map((p) => LABEL_TURNO_PREDEFINIDO[p]).join(", ")}).`;
          const usuariosEmpresa = await prisma.usuarioEmpresa.findMany({
            where: { empresaId: totem.empresaId },
            select: { usuario: { select: { email: true } } },
          });
          for (const { usuario } of usuariosEmpresa) {
            await enviarEmailHorarioEntradaIncomum(usuario.email, pessoa.nome, motivo, pessoa.id);
          }
        }
      } else if (!dados.confirmarHorarioIncomum) {
        const horarioNominalMin =
          categoriaEntrada === "MADRUGADA"
            ? empresaHorariosEntrada.horarioInicioMadrugadaMin
            : categoriaEntrada === "MANHA"
              ? empresaHorariosEntrada.horarioInicioDiaMin
              : empresaHorariosEntrada.horarioInicioNoiteMin;
        const desvio = calcularDesvioEntradaMin(agora, horarioNominalMin);
        if (desvio > LIMIAR_TOLERANCIA_ENTRADA_MIN) {
          return {
            precisaConfirmarHorario:
              "Você está chegando agora mesmo? Confirme que quer iniciar um turno agora.",
          };
        }
      }
    }
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

  const resultado = await comRetentativaDePoolOuErro(() =>
    prisma.$transaction(async (tx) => {
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
          horaEntrada: agora,
          fotoEntradaUrl: fotoUrl,
          assinaturaContratoUrl: assinaturaUrl,
          status: "ABERTO",
          // Pessoa CLT só chega em iniciarTurno pelo fluxo de extra pago
          // (CLT_OU_EXTRA ou CLT_HORARIO_DIFERENTE, ver
          // buscarPessoaPorDocumento) — nunca pelo caminho normal de
          // freelancer. Marca aqui, sem precisar de nada extra vindo do
          // client, só pra colorir diferente nas listas de turno.
          origemExtraDiarioClt: vinculo?.tipoVinculo === "CLT",
        },
      });
    })
  );
  if ("erro" in resultado) return resultado;
  const turno = resultado;

  // Também guarda a foto mais recente no cadastro global, pra conferência
  // rápida na hora do CPF em visitas futuras.
  await prisma.pessoa.update({ where: { id: pessoa.id }, data: { fotoUrl } });

  // Casa esse check-in com um Extra Marcado 🤝 pendente pra hoje, se
  // existir — vira CUMPRIDO em vez de ficar parado até o cron de
  // fechamento marcar falta (ver marcarFaltasExtraMarcado,
  // src/lib/fechamento-automatico.ts). Sem isso, TODO Extra Marcado
  // confirmado viraria falta mesmo quando a pessoa realmente aparece.
  const empresaHorarios = await prisma.empresa.findUnique({
    where: { id: totem.empresaId },
    select: { horarioInicioDiaMin: true, horarioInicioNoiteMin: true },
  });
  if (empresaHorarios) {
    const tipoTurno = classificarTurno(
      turno.horaEntrada,
      vinculo?.turnoPredefinido ?? "LIVRE",
      empresaHorarios.horarioInicioDiaMin,
      empresaHorarios.horarioInicioNoiteMin
    );
    const hojeISO = dataISOBrasil(turno.horaEntrada);
    const pendentes = await prisma.extraMarcado.findMany({
      where: { pessoaId: pessoa.id, empresaId: totem.empresaId, status: "CONFIRMADO", turnoId: null },
      select: { id: true, data: true, turnoTipo: true },
    });
    const combinado = pendentes.find((e) => dataISODoDbDate(e.data) === hojeISO && e.turnoTipo === tipoTurno);
    if (combinado) {
      await prisma.extraMarcado.update({
        where: { id: combinado.id },
        data: { status: "CUMPRIDO", turnoId: turno.id },
      });
    }
  }

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
        select: {
          modoPausaDia: true,
          modoPausaNoite: true,
          horarioInicioDiaMin: true,
          horarioInicioNoiteMin: true,
          diariaLimiarMeiaMin: true,
          diariaLimiarCompletaMin: true,
        },
      },
    },
  });
  if (!turno || turno.empresaId !== totem.empresaId || turno.status !== "ABERTO") {
    return { erro: "Turno inválido ou já encerrado." };
  }

  let modoPausaAplicavel: typeof turno.empresa.modoPausaDia;
  if (turno.turnoDobrado) {
    modoPausaAplicavel = turno.empresa.modoPausaNoite;
  } else {
    const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
      where: { pessoaId_empresaId: { pessoaId: turno.pessoaId, empresaId: turno.empresaId } },
      select: { turnoPredefinido: true },
    });
    const tipo = classificarTurno(
      turno.horaEntrada,
      vinculo?.turnoPredefinido ?? "LIVRE",
      turno.empresa.horarioInicioDiaMin,
      turno.empresa.horarioInicioNoiteMin
    );
    modoPausaAplicavel = tipo === "DIA" ? turno.empresa.modoPausaDia : turno.empresa.modoPausaNoite;
  }

  const horaSaida = new Date();
  const elapsedMs = horaSaida.getTime() - turno.horaEntrada.getTime();
  const { minutosTrabalhados, minutosDescontadosPausa, minutosArredondados } =
    calcularMinutosArredondados(elapsedMs, modoPausaAplicavel, turno.turnoDobrado ? 2 : 1);
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

  const resultado = await comRetentativaDePoolOuErro(() =>
    prisma.turno.update({
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
    })
  );
  if ("erro" in resultado) return resultado;

  // Tenta o PIX na hora — SALVO quando a duração deu fora do normal, caso
  // em que o pagamento fica retido pra revisão manual em vez de sair
  // sozinho (ver processarOuReterPagamentoTurno, src/lib/pagamentos/
  // processar.ts, e o caso real que motivou isso lá). Se falhar (ou ficar
  // retido), o admin resolve depois em /pagamentos ou /turnos — a pessoa
  // já assinou e pode ir embora, não fica esperando o resultado no totem.
  await processarOuReterPagamentoTurno(turno.id, minutosArredondados);

  return { minutosTrabalhados, minutosArredondados, valorTotal };
}

/** Avaliação do extra sobre a empresa, ao encerrar o turno — lado
 * simétrico de avaliarExtraPelaEmpresa (src/app/turnos/actions.ts). Sem
 * `requireTenant`/sessão nenhuma (o totem é público, sem login) — a única
 * checagem é que o turno pertence a este mesmo totem e já foi encerrado.
 * `upsert` pra ser seguro contra duplo toque no botão "Enviar avaliação". */
export async function avaliarEmpresaPeloExtra(
  turnoId: number,
  notaBruta: number,
  tagsBrutas: string[]
): Promise<{ erro: string } | undefined> {
  if (!notaValida(notaBruta)) return { erro: "Nota inválida." };

  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    select: { status: true },
  });
  if (!turno || (turno.status !== "CONCLUIDO" && turno.status !== "PAGO" && turno.status !== "ERRO_PAGAMENTO")) {
    return { erro: "Turno inválido ou ainda não encerrado." };
  }

  const tags = tagsValidadas(tagsBrutas, "EXTRA");

  await prisma.avaliacao.upsert({
    where: { turnoId_autor: { turnoId, autor: "EXTRA" } },
    update: { nota: notaBruta, tags },
    create: { turnoId, autor: "EXTRA", nota: notaBruta, tags },
  });

  return undefined;
}
