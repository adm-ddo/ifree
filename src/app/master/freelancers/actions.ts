"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/auth";

export type ResultadoExclusao = { erro: string } | { sucesso: true };

/** Exclusão de um cadastro global de freelancer — só permitida se a pessoa
 * não tiver nenhum turno registrado em nenhuma empresa (turno é histórico
 * de trabalho/pagamento, não dá pra simplesmente sumir com isso). Serve
 * pra tirar duplicata, erro de digitação no documento, ou pedido de
 * exclusão de alguém que nunca chegou a bater ponto de verdade. */
export async function excluirPessoaMaster(pessoaId: number): Promise<ResultadoExclusao> {
  await requireMaster();

  const totalTurnos = await prisma.turno.count({ where: { pessoaId } });
  if (totalTurnos > 0) {
    return {
      erro: `Essa pessoa tem ${totalTurnos} turno(s) registrado(s) — não pode ser excluída (é histórico de trabalho/pagamento). Bloqueie o vínculo com a empresa em vez de excluir.`,
    };
  }

  await prisma.pessoa.delete({ where: { id: pessoaId } });
  revalidatePath("/master/freelancers");
  return { sucesso: true };
}
