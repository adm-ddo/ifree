"use server";

import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { calcularMatch } from "@/lib/match";
import { pessoaProntaParaCandidatura } from "@/lib/perfil-completude";
import { revalidatePath } from "next/cache";

export type CandidatarSeResultado = { sucesso: true; match: boolean } | { erro: string };

/** Chamada direto pelo botão (não via form). O @@unique([vagaId, pessoaId])
 * no schema é a rede de segurança final contra candidatura duplicada —
 * aqui só checamos antes pra devolver uma mensagem amigável em vez de
 * deixar estourar erro de constraint.
 *
 * Se der match (calcularMatch, src/lib/match.ts), a Conversa entre a
 * empresa e a pessoa é criada (upsert) na hora — é por par empresa+pessoa,
 * não por candidatura, então continua valendo pra vagas futuras mesmo que
 * esta em particular seja recusada depois. */
export async function candidatarSe(vagaId: number): Promise<CandidatarSeResultado> {
  const sessao = await requirePessoaComTermosAceitos();

  const vaga = await prisma.vaga.findUnique({ where: { id: vagaId } });
  if (!vaga || vaga.status !== "ABERTA") {
    return { erro: "Essa vaga não está mais disponível." };
  }

  const existente = await prisma.candidatura.findUnique({
    where: { vagaId_pessoaId: { vagaId, pessoaId: sessao.pessoaId } },
  });
  if (existente) return { sucesso: true, match: existente.match };

  const pessoa = await prisma.pessoa.findUniqueOrThrow({
    where: { id: sessao.pessoaId },
    select: {
      habilidades: true,
      fotoPerfilUrl: true,
      biografia: true,
      chavePix: true,
      dataNascimento: true,
      endereco: true,
      numero: true,
      bairro: true,
      cep: true,
      cidade: true,
    },
  });

  const { pronta, faltando } = pessoaProntaParaCandidatura(pessoa);
  if (!pronta) {
    return {
      erro: `Complete seu perfil antes de se candidatar — falta: ${faltando.join(", ")}.`,
    };
  }

  const match = calcularMatch(vaga.habilidadesProcuradas, pessoa.habilidades);

  await prisma.candidatura.create({ data: { vagaId, pessoaId: sessao.pessoaId, match } });

  if (match) {
    await prisma.conversa.upsert({
      where: { empresaId_pessoaId: { empresaId: vaga.empresaId, pessoaId: sessao.pessoaId } },
      update: {},
      create: { empresaId: vaga.empresaId, pessoaId: sessao.pessoaId },
    });
  }

  revalidatePath("/portal/vagas");
  return { sucesso: true, match };
}

async function extraMarcadoDaPessoa(extraMarcadoId: number) {
  const sessao = await requirePessoaComTermosAceitos();
  const extra = await prisma.extraMarcado.findUnique({ where: { id: extraMarcadoId } });
  if (!extra || extra.pessoaId !== sessao.pessoaId) {
    throw new Error("Esse Extra Marcado não pertence a esta pessoa.");
  }
  return extra;
}

/** O "aperto de mãos" 🤝 do lado da pessoa — só agora, com os DOIS lados
 * confirmados, o VinculoPessoaEmpresa nasce de verdade (antes disso ela
 * não conseguia bater CPF no totem dessa empresa ainda). A tela que chama
 * isso é responsável por mostrar o aviso de reputação ANTES do clique —
 * ver AlertaExtraMarcado no Portal — porque não ter aviso nenhum não seria
 * justo: faltar depois de confirmar aqui vira falta automática (ver
 * marcarFaltasExtraMarcado, src/lib/fechamento-automatico.ts). */
export async function confirmarExtraMarcado(extraMarcadoId: number) {
  const extra = await extraMarcadoDaPessoa(extraMarcadoId);
  if (extra.status !== "AGUARDANDO_PESSOA") {
    throw new Error("Esse Extra Marcado não está mais esperando confirmação.");
  }

  await prisma.$transaction([
    prisma.extraMarcado.update({
      where: { id: extraMarcadoId },
      data: { status: "CONFIRMADO", confirmadoPessoaEm: new Date() },
    }),
    prisma.vinculoPessoaEmpresa.upsert({
      where: { pessoaId_empresaId: { pessoaId: extra.pessoaId, empresaId: extra.empresaId } },
      update: {},
      create: { pessoaId: extra.pessoaId, empresaId: extra.empresaId },
    }),
  ]);

  revalidatePath("/portal/vagas");
}

/** Ela decide não ir — nunca vira falta (falta automática só existe pra
 * quem confirmou e depois não apareceu, ver StatusExtraMarcado no schema). */
export async function recusarExtraMarcado(extraMarcadoId: number) {
  const extra = await extraMarcadoDaPessoa(extraMarcadoId);
  if (extra.status !== "AGUARDANDO_PESSOA") {
    throw new Error("Esse Extra Marcado não está mais esperando confirmação.");
  }
  await prisma.extraMarcado.update({ where: { id: extraMarcadoId }, data: { status: "CANCELADO" } });
  revalidatePath("/portal/vagas");
}
