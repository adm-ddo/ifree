import "server-only";
import { prisma } from "@/lib/prisma";
import { calcularMatch } from "@/lib/match";
import { enviarEmailVagaCompativel, enviarEmailCandidatoCompativel } from "@/lib/email";

/** Roda logo depois de criarVaga (src/app/vagas/actions.ts) — acha toda
 * Pessoa disponível cujo perfil combina com esta vaga RECÉM-publicada
 * (mesma regra de calcularMatch já usada na candidatura) e ainda não foi
 * registrada como match pra ela, avisa por e-mail e grava
 * VagaMatchPassivo (dedupe — nunca avisa a mesma dupla duas vezes).
 * Prospectivo: só roda pra vaga nova, nunca varre vaga antiga. */
export async function notificarPessoasSobreVagaNova(vagaId: number): Promise<{ notificadas: number }> {
  const vaga = await prisma.vaga.findUnique({
    where: { id: vagaId },
    select: {
      cargo: true,
      habilidadesProcuradas: true,
      nomeFantasia: true,
      empresa: { select: { nome: true } },
    },
  });
  if (!vaga) return { notificadas: 0 };

  const pessoas = await prisma.pessoa.findMany({
    where: { disponivelParaOportunidades: true },
    select: { id: true, nome: true, email: true, habilidades: true },
  });

  const empresaNome = vaga.nomeFantasia || vaga.empresa.nome;
  let notificadas = 0;
  for (const pessoa of pessoas) {
    if (!pessoa.email) continue; // Portal exige e-mail no cadastro, mas nunca é demais checar.
    if (!calcularMatch(vaga.habilidadesProcuradas, pessoa.habilidades)) continue;

    try {
      await prisma.vagaMatchPassivo.create({ data: { vagaId, pessoaId: pessoa.id } });
    } catch {
      continue; // Já existia (corrida rara com atualizarPerfilProfissional) — não reenvia.
    }
    await enviarEmailVagaCompativel(pessoa.email, pessoa.nome, vaga.cargo, empresaNome);
    notificadas++;
  }
  return { notificadas };
}

/** Roda logo depois de atualizarPerfilProfissional (src/app/portal/actions.ts)
 * — acha toda Vaga ABERTA cujas habilidadesProcuradas combinam com o
 * perfil RECÉM-atualizado desta pessoa e ainda não foi registrada, avisa
 * todos os usuários da empresa dona da vaga por e-mail e grava
 * VagaMatchPassivo (dedupe). Prospectivo: só roda quando a pessoa mexe no
 * próprio perfil, nunca varre pessoa antiga. */
export async function notificarEmpresasSobreNovoPerfil(pessoaId: number): Promise<{ notificadas: number }> {
  const pessoa = await prisma.pessoa.findUnique({
    where: { id: pessoaId },
    select: { habilidades: true, disponivelParaOportunidades: true },
  });
  if (!pessoa || !pessoa.disponivelParaOportunidades) return { notificadas: 0 };

  const vagas = await prisma.vaga.findMany({
    where: { status: "ABERTA" },
    select: {
      id: true,
      cargo: true,
      habilidadesProcuradas: true,
      nomeFantasia: true,
      empresa: {
        select: { nome: true, usuarios: { select: { usuario: { select: { email: true } } } } },
      },
    },
  });

  let notificadas = 0;
  for (const vaga of vagas) {
    if (!calcularMatch(vaga.habilidadesProcuradas, pessoa.habilidades)) continue;

    try {
      await prisma.vagaMatchPassivo.create({ data: { vagaId: vaga.id, pessoaId } });
    } catch {
      continue; // Já existia — não reenvia.
    }
    const empresaNome = vaga.nomeFantasia || vaga.empresa.nome;
    for (const { usuario } of vaga.empresa.usuarios) {
      await enviarEmailCandidatoCompativel(usuario.email, empresaNome, vaga.cargo);
    }
    notificadas++;
  }
  return { notificadas };
}
