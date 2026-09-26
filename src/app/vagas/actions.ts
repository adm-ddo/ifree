"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { normalizarTags } from "@/lib/habilidades";
import { revalidatePath } from "next/cache";

export type NovaVagaState = { erro?: string } | undefined;

const CATEGORIAS_VALIDAS = ["RESTAURANTE", "EVENTO", "OUTRO"] as const;

export async function criarVaga(
  _prev: NovaVagaState,
  formData: FormData
): Promise<NovaVagaState> {
  const sessao = await requireModulo("vagas");

  const categoriaBruta = String(formData.get("categoria") ?? "");
  const categoria = CATEGORIAS_VALIDAS.includes(categoriaBruta as (typeof CATEGORIAS_VALIDAS)[number])
    ? (categoriaBruta as (typeof CATEGORIAS_VALIDAS)[number])
    : "OUTRO";
  const cargo = String(formData.get("cargo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const nomeFantasia = String(formData.get("nomeFantasia") ?? "").trim();
  const habilidadesProcuradas = normalizarTags(formData.getAll("habilidadesProcuradas"));
  const turnoDia = formData.get("turnoDia") === "on";
  const turnoNoite = formData.get("turnoNoite") === "on";

  if (!cargo) return { erro: "Informe o cargo da vaga." };
  if (cargo.length > 100) return { erro: "O cargo pode ter no máximo 100 caracteres." };
  if (!descricao) return { erro: "Descreva a vaga." };
  if (descricao.length > 4000) return { erro: "A descrição pode ter no máximo 4000 caracteres." };
  if (localizacao.length > 150) return { erro: "A localização pode ter no máximo 150 caracteres." };
  if (nomeFantasia.length > 100) return { erro: "O nome fantasia pode ter no máximo 100 caracteres." };
  if (!turnoDia && !turnoNoite) return { erro: "Selecione pelo menos um turno (dia ou noite)." };

  await prisma.vaga.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      cargo,
      categoria,
      descricao,
      localizacao: localizacao || null,
      nomeFantasia: nomeFantasia || null,
      habilidadesProcuradas,
      turnoDia,
      turnoNoite,
      criadoPorEmail: sessao.email,
    },
  });

  revalidatePath("/vagas");
}

async function vagaDaEmpresa(vagaId: number) {
  const sessao = await requireModulo("vagas");
  const vaga = await prisma.vaga.findUnique({ where: { id: vagaId } });
  if (!vaga || vaga.empresaId !== sessao.empresaEfetivoId) {
    throw new Error("Essa vaga não pertence a esta empresa.");
  }
  return vaga;
}

export type EditarVagaState = { erro?: string; sucesso?: boolean } | undefined;

export async function atualizarVaga(
  vagaId: number,
  _prev: EditarVagaState,
  formData: FormData
): Promise<EditarVagaState> {
  await vagaDaEmpresa(vagaId);

  const cargo = String(formData.get("cargo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const nomeFantasia = String(formData.get("nomeFantasia") ?? "").trim();
  const habilidadesProcuradas = normalizarTags(formData.getAll("habilidadesProcuradas"));
  const turnoDia = formData.get("turnoDia") === "on";
  const turnoNoite = formData.get("turnoNoite") === "on";

  if (!cargo) return { erro: "Informe o cargo da vaga." };
  if (cargo.length > 100) return { erro: "O cargo pode ter no máximo 100 caracteres." };
  if (!descricao) return { erro: "Descreva a vaga." };
  if (descricao.length > 4000) return { erro: "A descrição pode ter no máximo 4000 caracteres." };
  if (localizacao.length > 150) return { erro: "A localização pode ter no máximo 150 caracteres." };
  if (nomeFantasia.length > 100) return { erro: "O nome fantasia pode ter no máximo 100 caracteres." };
  if (!turnoDia && !turnoNoite) return { erro: "Selecione pelo menos um turno (dia ou noite)." };

  await prisma.vaga.update({
    where: { id: vagaId },
    data: {
      cargo,
      descricao,
      localizacao: localizacao || null,
      nomeFantasia: nomeFantasia || null,
      habilidadesProcuradas,
      turnoDia,
      turnoNoite,
    },
  });

  revalidatePath(`/vagas/${vagaId}`);
  revalidatePath("/vagas");
  return { sucesso: true };
}

export async function pausarVaga(vagaId: number) {
  await vagaDaEmpresa(vagaId);
  await prisma.vaga.update({ where: { id: vagaId }, data: { status: "PAUSADA" } });
  revalidatePath("/vagas");
}

export async function reabrirVaga(vagaId: number) {
  await vagaDaEmpresa(vagaId);
  await prisma.vaga.update({ where: { id: vagaId }, data: { status: "ABERTA" } });
  revalidatePath("/vagas");
}

export async function encerrarVaga(vagaId: number) {
  await vagaDaEmpresa(vagaId);
  await prisma.vaga.update({ where: { id: vagaId }, data: { status: "ENCERRADA" } });
  revalidatePath("/vagas");
}
