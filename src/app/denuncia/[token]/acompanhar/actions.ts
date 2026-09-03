"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/data";
import {
  resolverEmpresaPorTokenDenuncia,
  verificarProtocoloSenha,
  criarSessaoDenunciaAnonima,
  getDenunciaIdDaSessaoAnonima,
  registrarLogAuditoria,
} from "@/lib/etica";
import type { MensagemChat, ResultadoBusca } from "@/components/ChatWindow";
import type { CategoriaDenuncia, StatusDenuncia } from "@/generated/prisma/enums";

export type EntrarState = { erro?: string } | undefined;

/** Confere protocolo+senha (com o núcleo compartilhado de
 * verificarProtocoloSenha) e abre a sessão anônima (cookie) — só depois
 * de confirmar que a denúncia é desta empresa (o canal público/totem é
 * escopado por empresa; o do Portal não é, ver
 * src/app/portal/denuncias/acompanhar/actions.ts). Compartilhado entre o
 * formulário da página pública (que redireciona pra si mesma depois) e o
 * painel embutido no totem (que NUNCA navega, só troca de tela dentro do
 * mesmo componente). */
async function autenticarComProtocolo(
  token: string,
  protocoloDigitado: string,
  senhaDigitada: string
): Promise<{ erro: string } | { erro?: undefined }> {
  const empresa = await resolverEmpresaPorTokenDenuncia(token);
  if (!empresa) return { erro: "Canal inválido." };

  const resultado = await verificarProtocoloSenha(protocoloDigitado, senhaDigitada);
  if ("erro" in resultado) return resultado;
  if (resultado.empresaId !== empresa.id) return { erro: "Protocolo ou senha inválidos." };

  await criarSessaoDenunciaAnonima(resultado.denunciaId);
  await registrarLogAuditoria(resultado.denunciaId, "acesso_via_protocolo");
  return {};
}

export async function entrarComProtocolo(
  token: string,
  _prev: EntrarState,
  formData: FormData
): Promise<EntrarState> {
  const resultado = await autenticarComProtocolo(
    token,
    String(formData.get("protocolo") ?? ""),
    String(formData.get("senha") ?? "")
  );
  if (resultado.erro) return resultado;
  redirect(`/denuncia/${token}/acompanhar`);
}

/** Mesma autenticação de entrarComProtocolo, mas sem redirect() — pro
 * painel embutido no totem, que precisa continuar na mesma tela depois
 * de logar (só troca de "tela" no estado do componente). */
export async function entrarComProtocoloEmbutido(
  token: string,
  protocolo: string,
  senha: string
): Promise<{ erro?: string }> {
  return autenticarComProtocolo(token, protocolo, senha);
}

export type DadosDenunciaAnonima = {
  protocolo: string;
  categoria: CategoriaDenuncia;
  status: StatusDenuncia;
  criadoEmLabel: string;
};

/** Dados do caso pra sessão anônima atual (cookie) — usado pelo painel
 * embutido do totem, que (por ser componente cliente) não pode ler o
 * banco direto igual a página /acompanhar (Server Component) faz. */
export async function buscarDadosDenunciaAnonima(): Promise<DadosDenunciaAnonima | null> {
  const denunciaId = await getDenunciaIdDaSessaoAnonima();
  if (!denunciaId) return null;

  const denuncia = await prisma.denuncia.findUnique({
    where: { id: denunciaId },
    select: { protocolo: true, categoria: true, status: true, criadoEm: true },
  });
  if (!denuncia) return null;

  return {
    protocolo: denuncia.protocolo,
    categoria: denuncia.categoria,
    status: denuncia.status,
    criadoEmLabel: formatarDataHora(denuncia.criadoEm),
  };
}

async function idDaSessaoOuFalha(): Promise<number> {
  const denunciaId = await getDenunciaIdDaSessaoAnonima();
  if (!denunciaId) throw new Error("Sessão expirada — entre de novo com protocolo e senha.");
  return denunciaId;
}

function paraChat(m: { id: number; autor: "EMPRESA" | "DENUNCIANTE"; texto: string; criadoEm: Date }): MensagemChat {
  return {
    id: m.id,
    autor: m.autor === "EMPRESA" ? "EMPRESA" : "PESSOA",
    texto: m.texto,
    criadoEm: m.criadoEm.toISOString(),
  };
}

// Denuncia não tem timestamp de "última leitura" por lado (diferente de
// Conversa, do iFREE Conecta) — outraLeituraEm sempre null aqui, então o
// ChatWindow mostra só o tique simples (enviada), nunca o duplo (lida).
export async function buscarMensagensDenunciaAnonima(): Promise<ResultadoBusca> {
  const denunciaId = await idDaSessaoOuFalha();
  const mensagens = await prisma.mensagemDenuncia.findMany({
    where: { denunciaId },
    orderBy: { criadoEm: "asc" },
    select: { id: true, autor: true, texto: true, criadoEm: true },
  });
  return { mensagens: mensagens.map(paraChat), outraLeituraEm: null };
}

export async function enviarMensagemDenunciaAnonima(texto: string): Promise<{ erro?: string }> {
  const denunciaId = await idDaSessaoOuFalha();

  const textoLimpo = texto.trim();
  if (!textoLimpo) return { erro: "Mensagem vazia." };
  if (textoLimpo.length > 2000) return { erro: "Mensagem muito longa (máximo 2000 caracteres)." };

  await prisma.mensagemDenuncia.create({
    data: { denunciaId, autor: "DENUNCIANTE", texto: textoLimpo },
  });

  return {};
}
