"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireResponsavelEtica, registrarLogAuditoria, garantirTokenDenuncia, LABEL_STATUS_DENUNCIA } from "@/lib/etica";
import type { MensagemChat, ResultadoBusca } from "@/components/ChatWindow";
import type { GravidadeDenuncia, StatusDenuncia } from "@/generated/prisma/enums";

async function denunciaDaEmpresa(denunciaId: number) {
  const sessao = await requireResponsavelEtica();
  const denuncia = await prisma.denuncia.findUnique({ where: { id: denunciaId } });
  if (!denuncia || denuncia.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Essa denúncia não pertence a esta empresa.");
  }
  return { sessao, denuncia };
}

function paraChat(m: { id: number; autor: "EMPRESA" | "DENUNCIANTE"; texto: string; criadoEm: Date }): MensagemChat {
  return {
    id: m.id,
    autor: m.autor === "EMPRESA" ? "EMPRESA" : "PESSOA",
    texto: m.texto,
    criadoEm: m.criadoEm.toISOString(),
  };
}

// Denuncia não tem timestamp de "última leitura" por lado — outraLeituraEm
// sempre null, o ChatWindow então só mostra o tique simples (enviada).
export async function buscarMensagensDenunciaEmpresa(denunciaId: number): Promise<ResultadoBusca> {
  await denunciaDaEmpresa(denunciaId);
  const mensagens = await prisma.mensagemDenuncia.findMany({
    where: { denunciaId },
    orderBy: { criadoEm: "asc" },
    select: { id: true, autor: true, texto: true, criadoEm: true },
  });
  return { mensagens: mensagens.map(paraChat), outraLeituraEm: null };
}

export async function enviarMensagemDenunciaEmpresa(
  denunciaId: number,
  texto: string
): Promise<{ erro?: string }> {
  const { sessao } = await denunciaDaEmpresa(denunciaId);

  const textoLimpo = texto.trim();
  if (!textoLimpo) return { erro: "Mensagem vazia." };
  if (textoLimpo.length > 2000) return { erro: "Mensagem muito longa (máximo 2000 caracteres)." };

  await prisma.mensagemDenuncia.create({
    data: { denunciaId, autor: "EMPRESA", autorEmail: sessao.email, texto: textoLimpo },
  });

  return {};
}

export type EtapaState = { erro?: string } | undefined;

/** Avança (ou volta) a etapa da denúncia — a empresa pode escolher
 * qualquer uma das 7 etapas, não só "a próxima": tratativas reais às
 * vezes precisam voltar (ex.: de EM_INVESTIGACAO pra
 * AGUARDANDO_INFORMACOES de novo). Toda mudança fica registrada na linha
 * do tempo (EtapaDenuncia) e no log de auditoria, pra rastro completo. */
export async function avancarStatusDenuncia(
  denunciaId: number,
  novoStatus: StatusDenuncia,
  observacao: string
): Promise<EtapaState> {
  const { sessao, denuncia } = await denunciaDaEmpresa(denunciaId);
  if (denuncia.status === novoStatus) return {};

  const observacaoLimpa = observacao.trim() || null;

  await prisma.$transaction([
    prisma.denuncia.update({
      where: { id: denunciaId },
      data: {
        status: novoStatus,
        finalizadoEm: novoStatus === "FINALIZADO" ? new Date() : null,
      },
    }),
    prisma.etapaDenuncia.create({
      data: { denunciaId, status: novoStatus, observacao: observacaoLimpa, autorEmail: sessao.email },
    }),
    prisma.logAuditoriaDenuncia.create({
      data: {
        denunciaId,
        acao: "status_alterado",
        detalhe: `${LABEL_STATUS_DENUNCIA[denuncia.status]} → ${LABEL_STATUS_DENUNCIA[novoStatus]}${observacaoLimpa ? `: ${observacaoLimpa}` : ""}`,
        autorEmail: sessao.email,
      },
    }),
  ]);

  revalidatePath(`/etica/${denunciaId}`);
  revalidatePath("/etica");
  return {};
}

export async function definirGravidadeDenuncia(
  denunciaId: number,
  gravidade: GravidadeDenuncia
): Promise<void> {
  const { sessao } = await denunciaDaEmpresa(denunciaId);

  await prisma.denuncia.update({ where: { id: denunciaId }, data: { gravidade } });
  await registrarLogAuditoria(denunciaId, "gravidade_definida", gravidade, sessao.email);

  revalidatePath(`/etica/${denunciaId}`);
  revalidatePath("/etica");
}

/** Gera o token público do canal na primeira visita à Central de Ética,
 * se a empresa ainda não tiver um — mesmo idioma do token do Totem
 * (aleatório, base64url, tratado como senha de acesso). Idempotente: se
 * já existe, só devolve o que já tem. */
export async function gerarLinkPublicoDenuncia(): Promise<string> {
  const sessao = await requireResponsavelEtica();
  return garantirTokenDenuncia(sessao.empresaEfetivoId);
}
