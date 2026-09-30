"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { enviarPushPessoa, CHAMAR_ATENCAO_INTERVALO_HORAS } from "@/lib/push";
import type { MensagemChat, ResultadoBusca } from "@/components/ChatWindow";

async function conversaDaEmpresa(conversaId: number) {
  const sessao = await requireTenant();
  const conversa = await prisma.conversa.findUnique({ where: { id: conversaId } });
  if (!conversa || conversa.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Essa conversa não pertence a esta empresa.");
  }
  return conversa;
}

function paraChat(m: { id: number; autor: "EMPRESA" | "PESSOA"; texto: string; criadoEm: Date }): MensagemChat {
  return { id: m.id, autor: m.autor, texto: m.texto, criadoEm: m.criadoEm.toISOString() };
}

/** Também marca a conversa como lida pela empresa — mesmo espírito de
 * "buscar já marca como visto" usado em vários lugares deste projeto
 * (ex.: leitura implícita ao abrir uma tela). */
export async function buscarMensagensEmpresa(conversaId: number): Promise<ResultadoBusca> {
  const conversa = await conversaDaEmpresa(conversaId);

  const [mensagens, atualizada] = await Promise.all([
    prisma.mensagem.findMany({
      where: { conversaId: conversa.id },
      orderBy: { criadoEm: "asc" },
      select: { id: true, autor: true, texto: true, criadoEm: true },
    }),
    prisma.conversa.update({
      where: { id: conversa.id },
      data: { ultimaLeituraEmpresaEm: new Date() },
      select: { ultimaLeituraPessoaEm: true },
    }),
  ]);

  return {
    mensagens: mensagens.map(paraChat),
    outraLeituraEm: atualizada.ultimaLeituraPessoaEm?.toISOString() ?? null,
  };
}

export async function enviarMensagemEmpresa(
  conversaId: number,
  texto: string
): Promise<{ erro?: string }> {
  const sessao = await requireTenant();
  const conversa = await conversaDaEmpresa(conversaId);

  const textoLimpo = texto.trim();
  if (!textoLimpo) return { erro: "Mensagem vazia." };
  if (textoLimpo.length > 2000) return { erro: "Mensagem muito longa (máximo 2000 caracteres)." };

  await prisma.mensagem.create({
    data: {
      conversaId: conversa.id,
      autor: "EMPRESA",
      autorEmail: sessao.email,
      texto: textoLimpo,
    },
  });

  return {};
}

export type ChamarAtencaoState = { erro?: string; sucesso?: boolean };

/** Notificação push pro freelancer avisando que essa empresa está
 * esperando resposta numa conversa (ver src/lib/push.ts) — chamada
 * direto pelo botão "Chamar atenção" em /v2/conversas/[id], sem <form>.
 * Limita a 1x a cada CHAMAR_ATENCAO_INTERVALO_HORAS pra nunca virar
 * spam de notificação no celular de ninguém; avisa a empresa (em vez de
 * falhar silenciosamente) quando o freelancer nunca ativou notificação
 * nenhuma, pra ela saber que precisa tentar por outro canal. */
export async function chamarAtencaoConversa(conversaId: number): Promise<ChamarAtencaoState> {
  const sessao = await requireTenant();
  const conversa = await conversaDaEmpresa(conversaId);

  if (conversa.ultimaChamadaAtencaoEm) {
    const horasDesde = (Date.now() - conversa.ultimaChamadaAtencaoEm.getTime()) / (60 * 60 * 1000);
    if (horasDesde < CHAMAR_ATENCAO_INTERVALO_HORAS) {
      const faltam = Math.ceil(CHAMAR_ATENCAO_INTERVALO_HORAS - horasDesde);
      return { erro: `Você já chamou atenção recentemente — espera ${faltam}h pra chamar de novo.` };
    }
  }

  const { enviados, total } = await enviarPushPessoa(conversa.pessoaId, {
    title: sessao.empresaEfetivoNome ?? "Uma empresa",
    body: "Tem uma mensagem sua aguardando resposta sobre uma vaga.",
    url: `/portal/conversas/${conversa.id}`,
  });

  if (total === 0) {
    return { erro: "Essa pessoa ainda não ativou notificações no celular — não deu pra avisar por push." };
  }
  if (enviados === 0) {
    return { erro: "Não conseguimos entregar a notificação agora — tenta de novo mais tarde." };
  }

  await prisma.conversa.update({ where: { id: conversa.id }, data: { ultimaChamadaAtencaoEm: new Date() } });

  return { sucesso: true };
}
