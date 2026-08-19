"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Confirma que o admin já fez o PIX manualmente pelo banco (fora deste
 * sistema, já que ainda não há integração automática com a Stone) — marca
 * o pagamento como concluído e o turno como pago. */
export async function marcarPagamentoPagoManualmente(turnoId: number) {
  const sessao = await requireTenant();

  const turno = await prisma.turno.findUnique({ where: { id: turnoId } });
  if (!turno || turno.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Esse turno não pertence a esta empresa.");
  }

  await prisma.$transaction([
    prisma.pagamento.update({
      where: { turnoId },
      data: { status: "CONCLUIDO", processadoEm: new Date(), erro: null },
    }),
    prisma.turno.update({ where: { id: turnoId }, data: { status: "PAGO" } }),
  ]);

  revalidatePath("/pagamentos");
  revalidatePath("/turnos");
  revalidatePath(`/turnos/${turnoId}`);
  revalidatePath("/dashboard");
}
