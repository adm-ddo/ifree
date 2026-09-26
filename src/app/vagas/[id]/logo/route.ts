import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { servirComoImagem } from "@/lib/blob";

/** Logo/foto que a empresa escolheu pra uma vaga (Vaga.logoUrl) — blob
 * privado (mesmo padrão do resto do storage, ver uploadDataUrl em
 * src/lib/blob.ts), então não dá pra apontar <img src> direto pro blob:
 * o navegador do freelancer não tem como carregar uma URL privada.
 * Rota PÚBLICA de propósito (sem checagem de sessão, diferente de
 * /pessoas/[id]/foto) — é uma imagem que a própria empresa escolheu pra
 * divulgar numa vaga aberta ao público, sem dado sensível de pessoa
 * nenhuma envolvido.
 *
 * Bug real reportado pelo Thiago em 2026-09-26: VagaCard.tsx apontava
 * `<img src={vaga.logoUrl}>` direto pro blob privado — o upload
 * funcionava, mas o logo nunca aparecia pro freelancer (o navegador dele
 * não conseguia buscar a URL privada). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vagaId = Number(id);
  if (!Number.isInteger(vagaId)) notFound();

  const vaga = await prisma.vaga.findUnique({ where: { id: vagaId }, select: { logoUrl: true } });
  if (!vaga?.logoUrl) notFound();

  return servirComoImagem(vaga.logoUrl);
}
