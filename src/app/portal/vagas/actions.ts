"use server";

import { prisma } from "@/lib/prisma";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import { calcularMatch } from "@/lib/match";
import { pessoaProntaParaCandidatura } from "@/lib/perfil-completude";
import { revalidatePath } from "next/cache";

export type CandidatarSeResultado =
  | { sucesso: true; match: boolean; conversaId: number | null }
  | { erro: string };

/** Chamada direto pelo botão (não via form). O @@unique([vagaId, pessoaId])
 * no schema é a rede de segurança final contra candidatura duplicada —
 * aqui só checamos antes pra devolver uma mensagem amigável em vez de
 * deixar estourar erro de constraint.
 *
 * Se der match (calcularMatch, src/lib/match.ts), a Conversa entre a
 * empresa e a pessoa é criada (upsert) na hora — é por par empresa+pessoa,
 * não por candidatura, então continua valendo pra vagas futuras mesmo que
 * esta em particular seja recusada depois. `conversaId` no retorno (desde
 * 2026-09-28) deixa quem chamou (ver ChamarParaConversarBotao.tsx) levar a
 * pessoa direto pro chat assim que o match acontece, sem precisar navegar
 * de novo pra achar o link. */
export async function candidatarSe(vagaId: number): Promise<CandidatarSeResultado> {
  const sessao = await requirePessoaComTermosAceitos();

  const vaga = await prisma.vaga.findUnique({ where: { id: vagaId } });
  if (!vaga || vaga.status !== "ABERTA") {
    return { erro: "Essa vaga não está mais disponível." };
  }

  const existente = await prisma.candidatura.findUnique({
    where: { vagaId_pessoaId: { vagaId, pessoaId: sessao.pessoaId } },
  });
  if (existente) {
    const conversaExistente = existente.match
      ? await prisma.conversa.findUnique({
          where: { empresaId_pessoaId: { empresaId: vaga.empresaId, pessoaId: sessao.pessoaId } },
          select: { id: true },
        })
      : null;
    return { sucesso: true, match: existente.match, conversaId: conversaExistente?.id ?? null };
  }

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

  let conversaId: number | null = null;
  if (match) {
    const conversa = await prisma.conversa.upsert({
      where: { empresaId_pessoaId: { empresaId: vaga.empresaId, pessoaId: sessao.pessoaId } },
      update: {},
      create: { empresaId: vaga.empresaId, pessoaId: sessao.pessoaId },
    });
    conversaId = conversa.id;
  }

  revalidatePath("/portal/vagas");
  return { sucesso: true, match, conversaId };
}

async function extraMarcadoDaPessoa(extraMarcadoId: number) {
  const sessao = await requirePessoaComTermosAceitos();
  const extra = await prisma.extraMarcado.findUnique({ where: { id: extraMarcadoId } });
  if (!extra || extra.pessoaId !== sessao.pessoaId) {
    throw new Error("Esse Free não pertence a esta pessoa.");
  }
  return extra;
}

/** O "aperto de mãos" 🤝 do lado da pessoa — só agora, com os DOIS lados
 * confirmados, o VinculoPessoaEmpresa nasce de verdade (antes disso ela
 * não conseguia bater CPF no totem dessa empresa ainda). A tela que chama
 * isso é responsável por mostrar o aviso de reputação ANTES do clique —
 * ver AlertaExtraMarcado no Portal — porque não ter aviso nenhum não seria
 * justo: faltar depois de confirmar aqui vira falta automática (ver
 * marcarFaltasExtraMarcado, src/lib/fechamento-automatico.ts).
 *
 * Desliga disponivelParaOportunidades na mesma hora (pedido do Thiago em
 * 2026-09-28): quem já combinou um extra some das buscas de OUTRAS
 * empresas (MatchesRecentesBanner.tsx e buscarMaisCandidatosCompativeis,
 * src/app/vagas/, já filtram por esse campo) até ela mesma reativar
 * manualmente no Portal — evita ela ser chamada pra mais um extra bem em
 * cima do que já assumiu. Não bloqueia ela de se candidatar por conta
 * própria a outra vaga se quiser (isso continua liberado), só para de
 * empurrar oportunidade nova pra cima dela sem pedir. */
export async function confirmarExtraMarcado(extraMarcadoId: number) {
  const extra = await extraMarcadoDaPessoa(extraMarcadoId);
  if (extra.status !== "AGUARDANDO_PESSOA") {
    throw new Error("Esse Free não está mais esperando confirmação.");
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
    prisma.pessoa.update({
      where: { id: extra.pessoaId },
      data: { disponivelParaOportunidades: false },
    }),
  ]);

  revalidatePath("/portal/vagas");
  revalidatePath("/portal");
}

/** Ela decide não ir ANTES de ter confirmado — nunca vira falta nem conta
 * no contador de "desmarcou depois de aceitar" (esse só existe pra quem
 * já tinha confirmado, ver desmarcarFreeConfirmado abaixo); ela nunca
 * chegou a se comprometer de verdade. */
export async function recusarExtraMarcado(extraMarcadoId: number) {
  const extra = await extraMarcadoDaPessoa(extraMarcadoId);
  if (extra.status !== "AGUARDANDO_PESSOA") {
    throw new Error("Esse Free não está mais esperando confirmação.");
  }
  await prisma.extraMarcado.update({
    where: { id: extraMarcadoId },
    data: { status: "CANCELADO", canceladoPor: "PESSOA" },
  });
  revalidatePath("/portal/vagas");
}

/** Ela desmarca um Free que JÁ tinha confirmado — pedido do Thiago em
 * 2026-09-28: antes só a empresa podia desmarcar depois da confirmação,
 * ela ficava travada nisso. Diferente de recusarExtraMarcado (que só
 * vale ANTES de confirmar): aqui confirmadoPessoaEm já está preenchido,
 * então esse cancelamento conta no contador "desmarcou depois de
 * aceitar" mostrado pra empresa na reputação dela (ver ReputacaoCard.tsx
 * e candidatoDesmarcouDepoisDeAceitar em src/lib/confiabilidade-extra.ts).
 * Não mexe no VinculoPessoaEmpresa nem reativa disponivelParaOportunidades
 * sozinho — ela pode ter outros compromissos/histórico com a mesma
 * empresa, e reativar disponibilidade é decisão dela, não automática. */
export async function desmarcarFreeConfirmado(extraMarcadoId: number) {
  const extra = await extraMarcadoDaPessoa(extraMarcadoId);
  if (extra.status !== "CONFIRMADO") {
    throw new Error("Esse Free não está confirmado.");
  }
  await prisma.extraMarcado.update({
    where: { id: extraMarcadoId },
    data: { status: "CANCELADO", canceladoPor: "PESSOA" },
  });
  revalidatePath("/portal/vagas");
  revalidatePath("/portal");
}
