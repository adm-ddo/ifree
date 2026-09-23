"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { instanteBrasil } from "@/lib/data";
import { textoParaTermos } from "@/lib/termos";
import { uploadArquivo } from "@/lib/blob";
import { formatarDataSemHora } from "@/lib/data";
import {
  requireResponsavelGed,
  documentoGedDaEmpresa,
  montarSnapshotPessoa,
  resolverContratoCltTermos,
  calcularDataRetornoSuspensao,
  resolverTermoCiencia,
  montarAdvertenciaGenerica,
  montarMotivoResumoDocumentoGed,
  MODELOS_PADRAO_ADVERTENCIA,
  MODELO_ADVERTENCIA_GENERICA_ID,
  MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID,
  MODELO_SUSPENSAO_MOTIVO_LIVRE_ID,
  type HistoricoDisciplinarItem,
} from "@/lib/ged";
import type { TipoDocumentoGed } from "@/generated/prisma/enums";

/** Monta o histórico disciplinar (advertências/suspensões já geradas pra
 * essa pessoa nesta empresa, antes da data desta nova suspensão) usado
 * no modelo de suspensão por falta injustificada — congelado no
 * snapshotDados na hora da geração, nunca recalculado depois (mesma
 * filosofia de corpoTexto). */
async function montarHistoricoDisciplinar(
  pessoaId: number,
  empresaId: number,
  antesDe: Date
): Promise<HistoricoDisciplinarItem[]> {
  const anteriores = await prisma.documentoGed.findMany({
    where: { pessoaId, empresaId, tipo: { in: ["ADVERTENCIA", "SUSPENSAO"] }, dataDocumento: { lt: antesDe } },
    orderBy: { dataDocumento: "asc" },
    select: { tipo: true, dataDocumento: true, modeloNome: true, corpoTexto: true },
  });
  return anteriores.map((doc) => ({
    tipo: doc.tipo as "ADVERTENCIA" | "SUSPENSAO",
    data: doc.dataDocumento.toISOString(),
    motivo: montarMotivoResumoDocumentoGed(doc),
  }));
}

async function vinculoDaEmpresa(pessoaId: number, empresaId: number) {
  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId } },
    include: { pessoa: true },
  });
  if (!vinculo) throw new Error("Essa pessoa não pertence a esta empresa.");
  return vinculo;
}

async function modeloPapelDaEmpresa(modeloId: number, empresaId: number) {
  const modelo = await prisma.modeloPapelGed.findUnique({ where: { id: modeloId } });
  if (!modelo || modelo.empresaId !== empresaId) {
    throw new Error("Esse modelo não pertence a esta empresa.");
  }
  return modelo;
}

const MODELOS_PADRAO_POR_TIPO: Partial<Record<TipoDocumentoGed, readonly { nome: string; corpoTexto: string }[]>> = {
  ADVERTENCIA: MODELOS_PADRAO_ADVERTENCIA,
};

export type GerarDocumentoState = { erro?: string; documentoId?: number } | undefined;

/** Gera um documento (advertência/suspensão/contrato de trabalho) pra
 * uma pessoa — resolve o corpo do texto (modelo escolhido, padrão do
 * sistema, ou o contrato CLT da empresa), congela um snapshot dos dados
 * da pessoa/empresa, e cria o registro. Mesma pré-condição de
 * podeGerarAdvertencia em funcionarios/[id]/page.tsx (CTPS + cargo),
 * reaproveitada pros três tipos. */
export async function gerarDocumentoGed(
  pessoaId: number,
  tipo: TipoDocumentoGed,
  _prev: GerarDocumentoState,
  formData: FormData
): Promise<GerarDocumentoState> {
  const sessao = await requireResponsavelGed();
  const vinculo = await vinculoDaEmpresa(pessoaId, sessao.empresaEfetivoId);
  const { pessoa } = vinculo;

  // Termo de ciência/advertência/suspensão só precisam de nome e CPF —
  // todo mundo já tem (campos obrigatórios desde o cadastro), então não
  // há pré-condição extra pra esses três. Só o contrato de trabalho CLT
  // exige CTPS e cargo (dados que compõem o próprio texto do contrato).
  if (tipo === "CONTRATO_TRABALHO") {
    if (vinculo.tipoVinculo !== "CLT") {
      return { erro: "Contrato de trabalho só se aplica a vínculo CLT." };
    }
    if (!pessoa.ctpsNumero || !pessoa.ctpsSerieUf || !vinculo.cargo) {
      return { erro: "Faltam dados obrigatórios (CTPS e cargo) — preencha no cadastro da pessoa antes de gerar o contrato." };
    }
  }

  const dataBruta = String(formData.get("data") ?? "").trim();
  if (!dataBruta) return { erro: "Informe a data do documento." };
  const dataDocumento = instanteBrasil(dataBruta);
  if (Number.isNaN(dataDocumento.getTime())) return { erro: "Informe uma data válida." };

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { nome: true, cnpj: true, endereco: true, contratoCltTermos: true },
  });

  const snapshotBase = montarSnapshotPessoa(pessoa, vinculo, empresa);

  // Termo de ciência — texto fixo do catálogo (TERMOS_CIENCIA_PADRAO),
  // sem modelo escolhível de verdade, só qual termo do catálogo.
  if (tipo === "TERMO_CIENCIA") {
    const termoSlug = String(formData.get("termoSlug") ?? "");
    const valorPremioMensal =
      vinculo.valorPremioAssiduidade !== null ? Number(vinculo.valorPremioAssiduidade) : null;
    const termo = resolverTermoCiencia(termoSlug, empresa.nome, empresa.cnpj, empresa.endereco, valorPremioMensal);
    if (!termo) return { erro: "Selecione o termo." };

    const documento = await prisma.documentoGed.create({
      data: {
        empresaId: sessao.empresaEfetivoId,
        pessoaId,
        tipo,
        modeloId: null,
        modeloNome: termo.nome,
        corpoTexto: termo.paragrafos.join("\n\n"),
        dataDocumento,
        snapshotDados: { ...snapshotBase, termoSlug, termoNome: termo.nome },
        geradoPorEmail: sessao.email,
      },
    });

    revalidatePath(`/ged/pessoas/${pessoaId}`);
    return { documentoId: documento.id };
  }

  // Suspensão tem dois modelos fixos (não são um catálogo escolhível de
  // texto livre como advertência): "falta injustificada" (com histórico
  // disciplinar automático) e "motivo livre" (o modelo original, motivo
  // digitado na hora) — em ambos o resto (nome, empresa, período, data de
  // retorno) é calculado aqui. Ver suspensao-pdf.tsx.
  if (tipo === "SUSPENSAO") {
    const modeloSuspensao = String(formData.get("modeloSuspensao") ?? "");
    const diasSuspensao = Number(formData.get("dias"));
    if (!Number.isInteger(diasSuspensao) || diasSuspensao < 1) {
      return { erro: "Informe uma quantidade válida de dias." };
    }
    const dataRetorno = calcularDataRetornoSuspensao(dataDocumento, diasSuspensao);

    if (modeloSuspensao === MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID) {
      const dataFaltaBruta = String(formData.get("dataFalta") ?? "").trim();
      const periodoTurno = String(formData.get("periodoTurno") ?? "").trim();
      if (!dataFaltaBruta) return { erro: "Informe a data da falta." };
      const dataFalta = instanteBrasil(dataFaltaBruta);
      if (Number.isNaN(dataFalta.getTime())) return { erro: "Informe uma data da falta válida." };
      if (!periodoTurno) return { erro: "Informe o período/turno da ausência." };

      const historico = await montarHistoricoDisciplinar(pessoaId, sessao.empresaEfetivoId, dataDocumento);
      const corpoTexto = `Falta injustificada ao trabalho ocorrida em ${formatarDataSemHora(dataFalta)}, no período/turno ${periodoTurno}.`;

      const documento = await prisma.documentoGed.create({
        data: {
          empresaId: sessao.empresaEfetivoId,
          pessoaId,
          tipo,
          modeloId: null,
          modeloNome: "Falta injustificada",
          corpoTexto,
          dataDocumento,
          snapshotDados: {
            ...snapshotBase,
            modelo: MODELO_SUSPENSAO_FALTA_INJUSTIFICADA_ID,
            motivo: corpoTexto,
            diasSuspensao,
            periodoInicio: dataDocumento.toISOString(),
            dataRetorno: dataRetorno.toISOString(),
            dataFalta: dataFalta.toISOString(),
            periodoTurno,
            historico,
          },
          geradoPorEmail: sessao.email,
        },
      });

      revalidatePath(`/ged/pessoas/${pessoaId}`);
      return { documentoId: documento.id };
    }

    const motivo = String(formData.get("motivo") ?? "").trim();
    if (!motivo) return { erro: "Informe o motivo da suspensão." };

    const documento = await prisma.documentoGed.create({
      data: {
        empresaId: sessao.empresaEfetivoId,
        pessoaId,
        tipo,
        modeloId: null,
        modeloNome: "Suspensão",
        corpoTexto: motivo,
        dataDocumento,
        snapshotDados: {
          ...snapshotBase,
          modelo: MODELO_SUSPENSAO_MOTIVO_LIVRE_ID,
          motivo,
          diasSuspensao,
          periodoInicio: dataDocumento.toISOString(),
          dataRetorno: dataRetorno.toISOString(),
        },
        geradoPorEmail: sessao.email,
      },
    });

    revalidatePath(`/ged/pessoas/${pessoaId}`);
    return { documentoId: documento.id };
  }

  let corpoTexto: string;
  let modeloNome: string;

  if (tipo === "CONTRATO_TRABALHO") {
    corpoTexto = resolverContratoCltTermos(empresa.contratoCltTermos).join("\n\n");
    modeloNome = "Contrato de trabalho CLT";
  } else {
    const modeloIdBruto = String(formData.get("modeloId") ?? "");
    if (tipo === "ADVERTENCIA" && modeloIdBruto === MODELO_ADVERTENCIA_GENERICA_ID) {
      const motivo = String(formData.get("motivo") ?? "").trim();
      if (!motivo) return { erro: "Informe o motivo da advertência." };
      corpoTexto = montarAdvertenciaGenerica(motivo);
      modeloNome = "Motivo livre";
    } else if (modeloIdBruto.startsWith("padrao:")) {
      const indice = Number(modeloIdBruto.slice("padrao:".length));
      const padrao = MODELOS_PADRAO_POR_TIPO[tipo]?.[indice];
      if (!padrao) return { erro: "Selecione um modelo." };
      corpoTexto = padrao.corpoTexto;
      modeloNome = padrao.nome;
    } else {
      return { erro: "Selecione um modelo." };
    }
  }

  const documento = await prisma.documentoGed.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      pessoaId,
      tipo,
      modeloId: null,
      modeloNome,
      corpoTexto,
      dataDocumento,
      snapshotDados: snapshotBase,
      geradoPorEmail: sessao.email,
    },
  });

  revalidatePath(`/ged/pessoas/${pessoaId}`);
  return { documentoId: documento.id };
}

/** Anexa o scan/foto da via assinada fisicamente a um DocumentoGed já
 * gerado — não muda o texto nem a data, só marca que o documento tem
 * comprovante assinado guardado. */
export async function uploadDocumentoAssinado(documentoId: number, formData: FormData): Promise<{ erro?: string }> {
  const sessao = await requireResponsavelGed();
  const documento = await documentoGedDaEmpresa(documentoId, sessao.empresaEfetivoId);

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) return { erro: "Selecione um arquivo." };

  const url = await uploadArquivo(`ged/documentos/${documentoId}/assinado-${Date.now()}`, arquivo);

  await prisma.documentoGed.update({
    where: { id: documentoId },
    data: { arquivoAssinadoUrl: url, arquivoAssinadoEm: new Date(), arquivoAssinadoPorEmail: sessao.email },
  });

  revalidatePath(`/ged/pessoas/${documento.pessoaId}`);
  revalidatePath(`/v2/ged/pessoas/${documento.pessoaId}`);
  return {};
}

/** Remove só o scan/foto assinado anexado, mantendo o DocumentoGed (texto,
 * data, histórico) intacto — usado tanto pelo botão "Remover" quanto,
 * indiretamente, pelo fluxo de "Trocar" no client (que chama isto e, na
 * sequência, uploadDocumentoAssinado com o arquivo novo). Mesma permissão
 * de quem anexa (não é master-only como removerDocumentoGed — apagar o
 * documento gerado inteiro é mais grave do que corrigir um anexo errado).
 * Não apaga o arquivo antigo do Blob, mesmo padrão já aceito em
 * removerDocumentoGed/removerEntradaEpi/removerModeloPapel. */
export async function removerArquivoAssinado(documentoId: number): Promise<{ erro?: string }> {
  const sessao = await requireResponsavelGed();
  const documento = await documentoGedDaEmpresa(documentoId, sessao.empresaEfetivoId);

  await prisma.documentoGed.update({
    where: { id: documentoId },
    data: { arquivoAssinadoUrl: null, arquivoAssinadoEm: null, arquivoAssinadoPorEmail: null },
  });

  revalidatePath(`/ged/pessoas/${documento.pessoaId}`);
  revalidatePath(`/v2/ged/pessoas/${documento.pessoaId}`);
  return {};
}

export type AdicionarEpiState = { erro?: string } | undefined;

export async function adicionarEntradaEpi(
  pessoaId: number,
  _prev: AdicionarEpiState,
  formData: FormData
): Promise<AdicionarEpiState> {
  const sessao = await requireResponsavelGed();
  await vinculoDaEmpresa(pessoaId, sessao.empresaEfetivoId);

  const item = String(formData.get("item") ?? "").trim();
  const quantidade = Number(formData.get("quantidade") ?? 1);
  const numeroCA = String(formData.get("numeroCA") ?? "").trim();
  const valorUnitarioBruto = String(formData.get("valorUnitario") ?? "").trim();
  const dataBruta = String(formData.get("dataEntrega") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!item) return { erro: "Informe o item entregue." };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { erro: "Quantidade inválida." };
  if (!dataBruta) return { erro: "Informe a data de entrega." };
  const dataEntrega = instanteBrasil(dataBruta);
  if (Number.isNaN(dataEntrega.getTime())) return { erro: "Informe uma data válida." };

  await prisma.entradaEpi.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      pessoaId,
      item,
      quantidade,
      numeroCA: numeroCA || null,
      valorUnitario: valorUnitarioBruto ? valorUnitarioBruto : null,
      dataEntrega,
      observacao: observacao || null,
      registradoPorEmail: sessao.email,
    },
  });

  revalidatePath(`/ged/pessoas/${pessoaId}/epi`);
}

export async function removerEntradaEpi(entradaId: number): Promise<void> {
  const sessao = await requireResponsavelGed();
  const entrada = await prisma.entradaEpi.findUnique({ where: { id: entradaId } });
  if (!entrada || entrada.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Essa entrada não pertence a esta empresa.");
  }
  await prisma.entradaEpi.delete({ where: { id: entradaId } });
  revalidatePath(`/ged/pessoas/${entrada.pessoaId}/epi`);
}

export type SalvarTextoState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarRegulamentoInterno(
  _prev: SalvarTextoState,
  formData: FormData
): Promise<SalvarTextoState> {
  const sessao = await requireResponsavelGed();
  const texto = String(formData.get("texto") ?? "").trim();
  if (texto && textoParaTermos(texto).length === 0) {
    return { erro: "Escreva pelo menos um parágrafo." };
  }

  await prisma.empresa.update({
    where: { id: sessao.empresaEfetivoId },
    data: { regulamentoInterno: texto || null },
  });

  revalidatePath("/ged/regulamento");
  return { sucesso: true };
}

/** Apaga a customização e volta pro modelo padrão do sistema — mesmo
 * espírito de restaurarTermosPadrao em src/app/configuracoes/actions.ts. */
export async function restaurarRegulamentoInterno(): Promise<void> {
  const sessao = await requireResponsavelGed();
  await prisma.empresa.update({ where: { id: sessao.empresaEfetivoId }, data: { regulamentoInterno: null } });
  revalidatePath("/ged/regulamento");
}

export type UploadModeloPapelState = { erro?: string; sucesso?: boolean } | undefined;

export async function uploadModeloPapel(
  _prev: UploadModeloPapelState,
  formData: FormData
): Promise<UploadModeloPapelState> {
  const sessao = await requireResponsavelGed();
  const nome = String(formData.get("nome") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;

  if (!nome) return { erro: "Dê um nome ao modelo." };
  if (!arquivo || arquivo.size === 0) return { erro: "Selecione um arquivo." };

  const url = await uploadArquivo(`ged/modelos-papel/${sessao.empresaEfetivoId}/${Date.now()}`, arquivo);

  await prisma.modeloPapelGed.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      nome,
      arquivoUrl: url,
      contentType: arquivo.type || "application/octet-stream",
      criadoPorEmail: sessao.email,
    },
  });

  revalidatePath("/ged/modelos");
  return { sucesso: true };
}

export async function removerModeloPapel(modeloId: number): Promise<void> {
  const sessao = await requireResponsavelGed();
  await modeloPapelDaEmpresa(modeloId, sessao.empresaEfetivoId);
  await prisma.modeloPapelGed.delete({ where: { id: modeloId } });
  revalidatePath("/ged/modelos");
}

/** Apaga um documento gerado (advertência, suspensão, termo de ciência,
 * contrato) — restrito ao master (Thiago em pessoa, 2026-09-22: ele faz
 * muitos testes de geração de documento e precisa poder limpar depois;
 * login de empresa nunca vê nem deve ver esse botão, documento gerado é
 * registro formal de RH, não algo que o dono da empresa deveria poder
 * apagar). Não apaga o arquivo assinado do Blob se houver um anexado
 * (mesmo padrão de removerEntradaEpi/removerModeloPapel acima, que
 * também só removem a linha do banco). */
export async function removerDocumentoGed(documentoId: number): Promise<void> {
  const sessao = await requireResponsavelGed();
  if (!sessao.isMaster) {
    throw new Error("Só o master pode excluir documentos gerados.");
  }
  const documento = await documentoGedDaEmpresa(documentoId, sessao.empresaEfetivoId);
  await prisma.documentoGed.delete({ where: { id: documentoId } });
  revalidatePath(`/ged/pessoas/${documento.pessoaId}`);
  revalidatePath(`/v2/ged/pessoas/${documento.pessoaId}`);
}
