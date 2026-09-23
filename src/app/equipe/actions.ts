"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminEquipe } from "@/lib/adminEquipe";
import { filtrarModulosValidos, type ModuloEquipe } from "@/lib/modulosEquipe";
import { criarConviteEquipe } from "@/lib/conviteEquipe";

/** Todas as actions abaixo são escopadas à empresa ATUAL da sessão
 * (sessao.empresaEfetivoId, resolvida por requireAdminEquipe) — nunca
 * recebem empresaId do cliente. Antes disso, o formulário aceitava
 * escolher entre "sessao.minhasEmpresas" (as empresas do PRÓPRIO login),
 * o que fazia pouco sentido quando o master está dentro de uma empresa
 * de cliente (ela nunca é "sua"): ele via a lista das próprias empresas
 * em vez de conseguir gerenciar a equipe da empresa que estava
 * visitando. Reportado pelo Thiago em 2026-09-22 (caso real: Bar
 * Cabral). Cada função revalida só as duas rotas de equipe (nunca a
 * rota da empresa errada, já que só existe uma empresa em jogo aqui). */

export type ConviteEquipeState = { erro?: string; linkGerado?: string } | undefined;

/** Gera um convite de acesso por link pra empresa atual, com os módulos
 * que o dono marcou — quem abrir o link define nome/e-mail/senha e já
 * nasce com esse acesso (ver resgatarConviteEquipe em
 * src/app/convite-equipe/[token]/actions.ts). É a ÚNICA forma de dar
 * acesso novo — não existe mais um formulário onde o dono digita a
 * senha da outra pessoa (decisão do Thiago em 2026-09-22: a pessoa
 * sempre escolhe a própria senha no primeiro acesso). */
export async function gerarConviteEquipe(
  _prev: ConviteEquipeState,
  formData: FormData
): Promise<ConviteEquipeState> {
  const sessao = await requireAdminEquipe();

  const modulos = filtrarModulosValidos(formData.getAll("modulos").map(String));
  if (modulos.length === 0) {
    return { erro: "Marque pelo menos um módulo." };
  }

  const token = await criarConviteEquipe(sessao.empresaEfetivoId, sessao.usuarioId, modulos);

  revalidatePath("/equipe");
  revalidatePath("/v2/equipe");
  return { linkGerado: `https://ifree.app.br/convite-equipe/${token}` };
}

/** Cancela um convite ainda não resgatado da empresa atual — nunca apaga
 * a linha (fica no histórico), só marca revogadoEm; buscarConviteValido
 * trata isso como inválido pra sempre. */
export async function revogarConviteEquipe(conviteId: number): Promise<void> {
  const sessao = await requireAdminEquipe();

  const convite = await prisma.conviteEquipe.findUnique({
    where: { id: conviteId },
    select: { empresaId: true, usadoEm: true },
  });
  if (!convite || convite.empresaId !== sessao.empresaEfetivoId || convite.usadoEm !== null) return;

  await prisma.conviteEquipe.update({
    where: { id: conviteId },
    data: { revogadoEm: new Date() },
  });

  revalidatePath("/equipe");
  revalidatePath("/v2/equipe");
}

/** Remove o acesso de um membro à empresa atual por completo — nunca o
 * próprio usuário logado, nunca uma conta master. Pra dar acesso de
 * novo depois de removido, gera outro convite. */
export async function removerAcessoEquipe(usuarioId: number): Promise<void> {
  const sessao = await requireAdminEquipe();
  if (usuarioId === sessao.usuarioId) return;

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { isMaster: true } });
  if (!alvo || alvo.isMaster) return;

  await prisma.usuarioEmpresa.deleteMany({ where: { usuarioId, empresaId: sessao.empresaEfetivoId } });

  revalidatePath("/equipe");
  revalidatePath("/v2/equipe");
}

/** Liga/desliga UM módulo (src/lib/modulosEquipe.ts) do acesso de um
 * membro na empresa atual — dá push/pull no array. Uma função só cobre
 * os 12 módulos, diferente de responsavelEtica/Ged/Pgr abaixo (cada um
 * com sua própria action, telas sensíveis separadas) porque aqui a
 * lista é grande o bastante pra repetir o padrão 12 vezes ser puro
 * custo sem ganho. */
export async function alternarModuloEquipe(
  usuarioId: number,
  modulo: ModuloEquipe,
  conceder: boolean
): Promise<void> {
  const sessao = await requireAdminEquipe();
  if (usuarioId === sessao.usuarioId) return;

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { isMaster: true } });
  if (!alvo || alvo.isMaster) return;

  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId: sessao.empresaEfetivoId } },
    select: { modulosPermitidos: true },
  });
  if (!vinculo) return;

  const atuais = new Set(vinculo.modulosPermitidos);
  if (conceder) atuais.add(modulo);
  else atuais.delete(modulo);

  await prisma.usuarioEmpresa.update({
    where: { usuarioId_empresaId: { usuarioId, empresaId: sessao.empresaEfetivoId } },
    data: { modulosPermitidos: Array.from(atuais) },
  });

  revalidatePath("/equipe");
  revalidatePath("/v2/equipe");
}

/** Marca/desmarca um membro como responsável pela Central de Ética na
 * empresa atual — só faz sentido pra quem já tem acesso geral; mesmas
 * checagens de alvo-não-master de alternarModuloEquipe. */
export async function alternarResponsavelEtica(usuarioId: number, valor: boolean): Promise<void> {
  const sessao = await requireAdminEquipe();
  if (usuarioId === sessao.usuarioId) return;

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { isMaster: true } });
  if (!alvo || alvo.isMaster) return;

  await prisma.usuarioEmpresa.updateMany({
    where: { usuarioId, empresaId: sessao.empresaEfetivoId },
    data: { responsavelEtica: valor },
  });

  revalidatePath("/equipe");
  revalidatePath("/v2/equipe");
}

/** Marca/desmarca um membro como responsável pelo GED na empresa atual —
 * cópia exata de alternarResponsavelEtica, só trocando o campo. */
export async function alternarResponsavelGed(usuarioId: number, valor: boolean): Promise<void> {
  const sessao = await requireAdminEquipe();
  if (usuarioId === sessao.usuarioId) return;

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { isMaster: true } });
  if (!alvo || alvo.isMaster) return;

  await prisma.usuarioEmpresa.updateMany({
    where: { usuarioId, empresaId: sessao.empresaEfetivoId },
    data: { responsavelGed: valor },
  });

  revalidatePath("/equipe");
  revalidatePath("/v2/equipe");
}

/** Marca/desmarca um membro como responsável pelo PGR na empresa atual —
 * cópia exata de alternarResponsavelEtica/Ged, só trocando o campo. */
export async function alternarResponsavelPgr(usuarioId: number, valor: boolean): Promise<void> {
  const sessao = await requireAdminEquipe();
  if (usuarioId === sessao.usuarioId) return;

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { isMaster: true } });
  if (!alvo || alvo.isMaster) return;

  await prisma.usuarioEmpresa.updateMany({
    where: { usuarioId, empresaId: sessao.empresaEfetivoId },
    data: { responsavelPgr: valor },
  });

  revalidatePath("/equipe");
  revalidatePath("/v2/equipe");
}
