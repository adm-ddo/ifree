"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/auth";
import { requirePessoaComTermosAceitos } from "@/lib/auth-pessoa";
import {
  criarDenunciaComProtocolo,
  gerarSenhaDenuncia,
  calcularPrazoSla,
  formatarProtocolo,
  CATEGORIAS_DENUNCIA,
} from "@/lib/etica";
import type { CategoriaDenuncia } from "@/generated/prisma/enums";

export type NovaDenunciaPortalState =
  | { erro: string; protocolo?: undefined; senha?: undefined }
  | { erro?: undefined; protocolo: string; senha: string }
  | undefined;

const DESCRICAO_MAX = 5000;

/** Cria a denúncia a partir do Portal — identificada (usa o login dela,
 * sem senha própria) ou anônima mesmo estando logada (nesse caso não
 * salva pessoaId, vira protocolo+senha igual ao canal público e some de
 * "Minhas denúncias"). */
export async function criarDenunciaPortal(
  _prev: NovaDenunciaPortalState,
  formData: FormData
): Promise<NovaDenunciaPortalState> {
  const sessao = await requirePessoaComTermosAceitos();

  const empresaId = Number(formData.get("empresaId"));
  const categoria = String(formData.get("categoria") ?? "") as CategoriaDenuncia;
  const descricao = String(formData.get("descricao") ?? "").trim();
  const identificarSe = formData.get("identificarSe") === "on";

  if (!Number.isInteger(empresaId)) return { erro: "Selecione a empresa." };
  if (!CATEGORIAS_DENUNCIA.some((c) => c.valor === categoria)) {
    return { erro: "Selecione o tipo de denúncia." };
  }
  if (!descricao) return { erro: "Descreva o que aconteceu." };
  if (descricao.length > DESCRICAO_MAX) {
    return { erro: `Descrição muito longa (máximo ${DESCRICAO_MAX} caracteres).` };
  }

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId: sessao.pessoaId, empresaId } },
    select: { empresaId: true },
  });
  if (!vinculo) return { erro: "Empresa inválida." };

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { slaDenunciaDias: true },
  });
  const prazoSlaEm = calcularPrazoSla(empresa.slaDenunciaDias, new Date());

  if (identificarSe) {
    const denuncia = await criarDenunciaComProtocolo({
      empresaId,
      senhaHash: null,
      identificado: true,
      pessoaId: sessao.pessoaId,
      categoria,
      descricao,
      prazoSlaEm,
    });
    redirect(`/portal/denuncias/${denuncia.id}`);
  }

  const senha = gerarSenhaDenuncia();
  const senhaHash = await hashSenha(senha);
  const denuncia = await criarDenunciaComProtocolo({
    empresaId,
    senhaHash,
    identificado: false,
    pessoaId: null,
    categoria,
    descricao,
    prazoSlaEm,
  });

  return { protocolo: formatarProtocolo(denuncia.protocolo), senha };
}
