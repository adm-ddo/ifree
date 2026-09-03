"use server";

import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import type { MensagemChat, ResultadoBusca } from "@/components/ChatWindow";

async function conversaDaPessoa(conversaId: number) {
  const sessao = await requirePessoaComTermosAceitos();
  const conversa = await prisma.conversa.findUnique({ where: { id: conversaId } });
  if (!conversa || conversa.pessoaId !== sessao.pessoaId) {
    throw new Error("Essa conversa não pertence a esta pessoa.");
  }
  return conversa;
}

function paraChat(m: { id: number; autor: "EMPRESA" | "PESSOA"; texto: string; criadoEm: Date }): MensagemChat {
  return { id: m.id, autor: m.autor, texto: m.texto, criadoEm: m.criadoEm.toISOString() };
}

export async function buscarMensagensPessoa(conversaId: number): Promise<ResultadoBusca> {
  const conversa = await conversaDaPessoa(conversaId);

  const [mensagens, atualizada] = await Promise.all([
    prisma.mensagem.findMany({
      where: { conversaId: conversa.id },
      orderBy: { criadoEm: "asc" },
      select: { id: true, autor: true, texto: true, criadoEm: true },
    }),
    prisma.conversa.update({
      where: { id: conversa.id },
      data: { ultimaLeituraPessoaEm: new Date() },
      select: { ultimaLeituraEmpresaEm: true },
    }),
  ]);

  return {
    mensagens: mensagens.map(paraChat),
    outraLeituraEm: atualizada.ultimaLeituraEmpresaEm?.toISOString() ?? null,
  };
}

export async function enviarMensagemPessoa(
  conversaId: number,
  texto: string
): Promise<{ erro?: string }> {
  const conversa = await conversaDaPessoa(conversaId);

  const textoLimpo = texto.trim();
  if (!textoLimpo) return { erro: "Mensagem vazia." };
  if (textoLimpo.length > 2000) return { erro: "Mensagem muito longa (máximo 2000 caracteres)." };

  await prisma.mensagem.create({
    data: { conversaId: conversa.id, autor: "PESSOA", texto: textoLimpo },
  });

  return {};
}
