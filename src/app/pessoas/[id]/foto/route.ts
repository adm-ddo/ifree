import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { servirComoImagem } from "@/lib/blob";

/** Foto de perfil do iFREE Conecta (Pessoa.fotoPerfilUrl — NUNCA fotoUrl,
 * que é a foto do último check-in no totem, sobrescrita a cada turno),
 * servida sob demanda pros avatares em /freelancers e no Painel — o blob
 * é privado, então não dá pra apontar <img src> direto pra ele; esta rota
 * baixa e repassa, verificando que a pessoa tem (ou já teve) vínculo com
 * a empresa da sessão, pra não vazar foto de gente de outra empresa
 * mudando o id na URL. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireTenant();
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isInteger(pessoaId)) notFound();

  const vinculo = await prisma.vinculoPessoaEmpresa.findFirst({
    where: { pessoaId, empresaId: sessao.empresaEfetivoId },
    select: { pessoa: { select: { fotoPerfilUrl: true } } },
  });
  if (!vinculo?.pessoa.fotoPerfilUrl) notFound();

  return servirComoImagem(vinculo.pessoa.fotoPerfilUrl);
}
