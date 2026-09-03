"use server";

import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import type { MensagemChat, ResultadoBusca } from "@/components/ChatWindow";

async function denunciaDaPessoa(denunciaId: number) {
  const sessao = await requirePessoaComTermosAceitos();
  const denuncia = await prisma.denuncia.findUnique({ where: { id: denunciaId } });
  if (!denuncia || denuncia.pessoaId !== sessao.pessoaId) {
    throw new Error("Essa denúncia não é sua.");
  }
  return denuncia;
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
export async function buscarMensagensDenunciaPessoa(denunciaId: number): Promise<ResultadoBusca> {
  await denunciaDaPessoa(denunciaId);
  const mensagens = await prisma.mensagemDenuncia.findMany({
    where: { denunciaId },
    orderBy: { criadoEm: "asc" },
    select: { id: true, autor: true, texto: true, criadoEm: true },
  });
  return { mensagens: mensagens.map(paraChat), outraLeituraEm: null };
}

export async function enviarMensagemDenunciaPessoa(
  denunciaId: number,
  texto: string
): Promise<{ erro?: string }> {
  await denunciaDaPessoa(denunciaId);

  const textoLimpo = texto.trim();
  if (!textoLimpo) return { erro: "Mensagem vazia." };
  if (textoLimpo.length > 2000) return { erro: "Mensagem muito longa (máximo 2000 caracteres)." };

  await prisma.mensagemDenuncia.create({
    data: { denunciaId, autor: "DENUNCIANTE", texto: textoLimpo },
  });

  return {};
}
