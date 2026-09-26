"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil } from "@/lib/data";
import { revalidatePath } from "next/cache";
import type { TurnoExtraMarcado } from "@/generated/prisma/enums";

async function candidaturaDaEmpresa(candidaturaId: number) {
  const sessao = await requireTenant();
  const candidatura = await prisma.candidatura.findUnique({
    where: { id: candidaturaId },
    include: { vaga: true },
  });
  if (!candidatura || candidatura.vaga.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Essa candidatura não pertence a esta empresa.");
  }
  return candidatura;
}

/** Só marca que a empresa quer essa pessoa — NÃO cria mais o
 * VinculoPessoaEmpresa direto (mudou em 2026-09-26, pedido do Thiago): o
 * vínculo agora só nasce quando os dois lados "apertam a mão" num Extra
 * Marcado específico (ver criarExtraMarcado abaixo e confirmarExtraMarcado
 * em src/app/portal/vagas/actions.ts) — aceitar sozinho não é mais
 * compromisso suficiente pra liberar o totem. */
export async function aceitarCandidatura(candidaturaId: number) {
  const candidatura = await candidaturaDaEmpresa(candidaturaId);
  await prisma.candidatura.update({ where: { id: candidaturaId }, data: { status: "ACEITA" } });
  revalidatePath(`/vagas/${candidatura.vagaId}`);
}

export async function recusarCandidatura(candidaturaId: number) {
  const candidatura = await candidaturaDaEmpresa(candidaturaId);
  await prisma.candidatura.update({ where: { id: candidaturaId }, data: { status: "RECUSADA" } });
  revalidatePath(`/vagas/${candidatura.vagaId}`);
}

export type CriarExtraMarcadoState = { erro?: string; sucesso?: boolean } | undefined;

/** Empresa propõe o "aperto de mãos" 🤝 — dia específico + turno (dia ou
 * noite) — depois de já ter aceitado a candidatura e conversado pelo chat.
 * Só cria o registro do lado da empresa (confirmadoEmpresaEm), esperando a
 * pessoa confirmar do lado dela (ver confirmarExtraMarcado); o
 * VinculoPessoaEmpresa nasce só quando os dois confirmarem. Uma candidatura
 * pode gerar vários Extras Marcados ao longo do tempo (ex.: "vem sexta" e
 * depois "vem semana que vem de novo"). */
export async function criarExtraMarcado(
  candidaturaId: number,
  _prev: CriarExtraMarcadoState,
  formData: FormData
): Promise<CriarExtraMarcadoState> {
  const candidatura = await candidaturaDaEmpresa(candidaturaId);
  if (candidatura.status !== "ACEITA") {
    return { erro: "Aceite a candidatura antes de marcar um extra." };
  }

  const dataISO = String(formData.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return { erro: "Escolha uma data." };
  if (dataISO < dataISOBrasil(new Date())) {
    return { erro: "Escolha uma data de hoje em diante." };
  }

  const turnoTipo = String(formData.get("turnoTipo") ?? "") as TurnoExtraMarcado;
  if (turnoTipo !== "DIA" && turnoTipo !== "NOITE") return { erro: "Escolha o turno." };
  if (turnoTipo === "DIA" && !candidatura.vaga.turnoDia) {
    return { erro: "Essa vaga não aceita turno de dia." };
  }
  if (turnoTipo === "NOITE" && !candidatura.vaga.turnoNoite) {
    return { erro: "Essa vaga não aceita turno de noite." };
  }

  await prisma.extraMarcado.create({
    data: {
      candidaturaId: candidatura.id,
      vagaId: candidatura.vagaId,
      empresaId: candidatura.vaga.empresaId,
      pessoaId: candidatura.pessoaId,
      data: new Date(`${dataISO}T00:00:00.000Z`),
      turnoTipo,
    },
  });

  revalidatePath(`/vagas/${candidatura.vagaId}`);
  return { sucesso: true };
}

/** Empresa desiste de um Extra Marcado antes da pessoa confirmar (ou
 * mesmo depois, se o combinado mudar) — nunca vira falta, é diferente de
 * NAO_COMPARECEU (que só acontece quando os dois já confirmaram e ela
 * simplesmente não apareceu). */
export async function cancelarExtraMarcadoEmpresa(extraMarcadoId: number) {
  const sessao = await requireTenant();
  const extra = await prisma.extraMarcado.findUnique({ where: { id: extraMarcadoId } });
  if (!extra || extra.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Esse Extra Marcado não pertence a esta empresa.");
  }
  if (extra.status !== "AGUARDANDO_PESSOA" && extra.status !== "CONFIRMADO") {
    throw new Error("Esse Extra Marcado não pode mais ser cancelado.");
  }
  await prisma.extraMarcado.update({ where: { id: extraMarcadoId }, data: { status: "CANCELADO" } });
  revalidatePath(`/vagas/${extra.vagaId}`);
}
