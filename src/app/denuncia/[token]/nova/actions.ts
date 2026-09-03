"use server";

import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/auth";
import { cpfValido } from "@/lib/cpf";
import {
  resolverEmpresaPorTokenDenuncia,
  criarDenunciaComProtocolo,
  gerarSenhaDenuncia,
  calcularPrazoSla,
  formatarProtocolo,
  CATEGORIAS_DENUNCIA,
} from "@/lib/etica";
import type { CategoriaDenuncia } from "@/generated/prisma/enums";

export type NovaDenunciaState =
  | { erro: string; protocolo?: undefined; senha?: undefined }
  | { erro?: undefined; protocolo: string; senha: string }
  | undefined;

const DESCRICAO_MAX = 5000;

function validarCategoriaEDescricao(
  categoria: string,
  descricao: string
): { erro: string } | { categoria: CategoriaDenuncia; descricao: string } {
  if (!CATEGORIAS_DENUNCIA.some((c) => c.valor === categoria)) {
    return { erro: "Selecione o tipo de denúncia." };
  }
  if (!descricao) return { erro: "Descreva o que aconteceu." };
  if (descricao.length > DESCRICAO_MAX) {
    return { erro: `Descrição muito longa (máximo ${DESCRICAO_MAX} caracteres).` };
  }
  return { categoria: categoria as CategoriaDenuncia, descricao };
}

/** Cria a denúncia anônima do canal público — sem nenhum vínculo com
 * pessoa/usuário, protocolo+senha é o único jeito de acompanhar depois
 * (ver /denuncia/[token]/acompanhar). */
export async function criarDenunciaAnonimaPublica(
  token: string,
  _prev: NovaDenunciaState,
  formData: FormData
): Promise<NovaDenunciaState> {
  const empresa = await resolverEmpresaPorTokenDenuncia(token);
  if (!empresa) return { erro: "Canal inválido." };

  const validado = validarCategoriaEDescricao(
    String(formData.get("categoria") ?? ""),
    String(formData.get("descricao") ?? "").trim()
  );
  if ("erro" in validado) return validado;

  const senha = gerarSenhaDenuncia();
  const senhaHash = await hashSenha(senha);

  const denuncia = await criarDenunciaComProtocolo({
    empresaId: empresa.id,
    senhaHash,
    identificado: false,
    pessoaId: null,
    categoria: validado.categoria,
    descricao: validado.descricao,
    prazoSlaEm: calcularPrazoSla(empresa.slaDenunciaDias, new Date()),
  });

  return { protocolo: formatarProtocolo(denuncia.protocolo), senha };
}

export type NovaDenunciaIdentificadaState =
  | { erro: string; protocolo?: undefined }
  | { erro?: undefined; protocolo: string }
  | undefined;

/** Cria a denúncia se identificando por CPF (usado no totem, sem precisar
 * de login no Portal) — exige que o CPF já pertença a uma Pessoa
 * vinculada a ESTA empresa (não cria cadastro novo aqui: denúncia não é
 * fluxo de cadastro, e criar uma Pessoa só com CPF ficaria com dados
 * incompletos pro resto do sistema). Sem senha: quem se identifica
 * acompanha depois logada no Portal, em "Minhas denúncias" — a mesma
 * consulta de lá já filtra por pessoaId, então não precisa de nenhuma
 * mudança adicional pra isso funcionar. */
export async function criarDenunciaIdentificadaTotem(
  tokenDenuncia: string,
  _prev: NovaDenunciaIdentificadaState,
  formData: FormData
): Promise<NovaDenunciaIdentificadaState> {
  const empresa = await resolverEmpresaPorTokenDenuncia(tokenDenuncia);
  if (!empresa) return { erro: "Canal inválido." };

  const documento = String(formData.get("documento") ?? "");
  if (!cpfValido(documento)) return { erro: "Informe um CPF válido." };

  const validado = validarCategoriaEDescricao(
    String(formData.get("categoria") ?? ""),
    String(formData.get("descricao") ?? "").trim()
  );
  if ("erro" in validado) return validado;

  const pessoa = await prisma.pessoa.findUnique({
    where: { documento: documento.replace(/\D/g, "") },
    select: { id: true, vinculos: { where: { empresaId: empresa.id }, select: { empresaId: true } } },
  });
  if (!pessoa || pessoa.vinculos.length === 0) {
    return { erro: "Esse CPF não está cadastrado nesta empresa. Você pode continuar como anônimo." };
  }

  const denuncia = await criarDenunciaComProtocolo({
    empresaId: empresa.id,
    senhaHash: null,
    identificado: true,
    pessoaId: pessoa.id,
    categoria: validado.categoria,
    descricao: validado.descricao,
    prazoSlaEm: calcularPrazoSla(empresa.slaDenunciaDias, new Date()),
  });

  return { protocolo: formatarProtocolo(denuncia.protocolo) };
}
