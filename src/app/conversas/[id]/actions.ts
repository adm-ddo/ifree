"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
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
