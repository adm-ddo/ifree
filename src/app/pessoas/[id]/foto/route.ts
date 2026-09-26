import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { servirComoImagem } from "@/lib/blob";

/** Foto de perfil do iFREE Conecta (Pessoa.fotoPerfilUrl — NUNCA fotoUrl,
 * que é a foto do último check-in no totem, sobrescrita a cada turno),
 * servida sob demanda pros avatares em /freelancers e no Painel — o blob
 * é privado, então não dá pra apontar <img src> direto pra ele; esta rota
 * baixa e repassa, verificando que a pessoa tem (ou já teve) vínculo com
 * a empresa da sessão, OU se candidatou a alguma vaga dela, pra não vazar
 * foto de gente sem relação nenhuma com a empresa mudando o id na URL.
 *
 * Candidatura conta de propósito (bug real reportado pelo Thiago em
 * 2026-09-26): a lista de candidatos de uma vaga (CandidaturaCardV2, via
 * AvatarPessoa) mostra a foto de quem se candidatou, e antes do aceite
 * ainda não existe VinculoPessoaEmpresa nenhum — só passava a aparecer
 * depois de aceitar a candidatura, que é tarde demais (é justo na hora de
 * avaliar o candidato que a foto mais importa). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireTenant();
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) notFound();

  const [vinculo, candidatura] = await Promise.all([
    prisma.vinculoPessoaEmpresa.findFirst({
      where: { pessoaId, empresaId: sessao.empresaEfetivoId },
      select: { id: true },
    }),
    prisma.candidatura.findFirst({
      where: { pessoaId, vaga: { empresaId: sessao.empresaEfetivoId } },
      select: { id: true },
    }),
  ]);
  if (!vinculo && !candidatura) notFound();

  const pessoa = await prisma.pessoa.findUnique({
    where: { id: pessoaId },
    select: { fotoPerfilUrl: true },
  });
  if (!pessoa?.fotoPerfilUrl) notFound();

  return servirComoImagem(pessoa.fotoPerfilUrl);
}
