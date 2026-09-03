"use server";

import { prisma } from "@/lib/prisma";
import { requirePessoa } from "@/lib/auth-pessoa";
import { redirect } from "next/navigation";

export async function aceitarTermosPessoa(formData: FormData): Promise<void> {
  const sessao = await requirePessoa();

  if (formData.get("aceito") !== "on") {
    redirect("/portal/termos");
  }

  await prisma.pessoa.update({
    where: { id: sessao.pessoaId },
    data: { termosAceitosEm: new Date() },
  });

  redirect("/portal");
}
