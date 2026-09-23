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
