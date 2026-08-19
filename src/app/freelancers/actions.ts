"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { detectarTipoChavePix, chavePixValida } from "@/lib/documento";

export async function alternarAtivoVinculo(pessoaId: number, ativo: boolean) {
  const sessao = await requireTenant();

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) {
    throw new Error("Esse freelancer não pertence a esta empresa.");
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { ativo },
  });

  revalidatePath("/freelancers");
}

export type PagamentoState = { erro?: string; sucesso?: boolean } | undefined;

/** Modo de pagamento é sempre decisão do dono, nunca do freelancer — se a
 * pessoa pudesse escolher, escolheria o mais vantajoso caso a caso (hora
 * quando sabe que vai ficar pouco, diária quando sabe que vai ficar o dia
 * todo), o que sai caro pra empresa. */
export async function atualizarModoPagamentoVinculo(
  _prev: PagamentoState,
  formData: FormData
): Promise<PagamentoState> {
  const sessao = await requireTenant();

  const pessoaId = Number(formData.get("pessoaId"));
  const modoPagamento = String(formData.get("modoPagamento") ?? "");
  const frequenciaPagamento = String(formData.get("frequenciaPagamento") ?? "");
  if (!Number.isInteger(pessoaId)) return { erro: "Freelancer inválido." };
  if (modoPagamento !== "HORA" && modoPagamento !== "DIARIA") {
    return { erro: "Selecione um modo de pagamento válido." };
  }
  if (frequenciaPagamento !== "DIARIA" && frequenciaPagamento !== "SEMANAL") {
    return { erro: "Selecione uma frequência de pagamento válida." };
  }

  let valorDiaria: number | null = null;
  if (modoPagamento === "DIARIA") {
    const bruto = String(formData.get("valorDiaria") ?? "").replace(",", ".");
    valorDiaria = Number(bruto);
    if (!Number.isFinite(valorDiaria) || valorDiaria <= 0) {
      return { erro: "Informe um valor de diária válido." };
    }
  }

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) {
    return { erro: "Esse freelancer não pertence a esta empresa." };
  }

  await prisma.vinculoPessoaEmpresa.update({
    where: { id: vinculo.id },
    data: { modoPagamento, valorDiaria, frequenciaPagamento },
  });

  revalidatePath(`/freelancers/${pessoaId}`);
  return { sucesso: true };
}

export type DadosPessoaState = { erro?: string; sucesso?: boolean } | undefined;

/** Edição dos dados de contato/PIX do freelancer, direto pelo painel —
 * pra quando a pessoa não tem como fazer isso na hora pelo totem (ex.: só
 * lembra da chave PIX aleatória depois, longe do trabalho). Esses dados
 * são do cadastro global da Pessoa (não do vínculo com esta empresa
 * específica), então a edição vale pra todas as empresas onde ela
 * trabalha — mesmo comportamento de quando ela edita os próprios dados
 * pelo totem. O tipo da chave PIX é sempre detectado aqui no servidor, não
 * confia no que o formulário mandar. */
export async function atualizarDadosPessoaAdmin(
  _prev: DadosPessoaState,
  formData: FormData
): Promise<DadosPessoaState> {
  const sessao = await requireTenant();

  const pessoaId = Number(formData.get("pessoaId"));
  if (!Number.isInteger(pessoaId)) return { erro: "Freelancer inválido." };

  const vinculo = await prisma.vinculoPessoaEmpresa.findUnique({
    where: { pessoaId_empresaId: { pessoaId, empresaId: sessao.empresaEfetivoId } },
  });
  if (!vinculo) return { erro: "Esse freelancer não pertence a esta empresa." };

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const complemento = String(formData.get("complemento") ?? "").trim();
  const chavePix = String(formData.get("chavePix") ?? "").trim();

  if (!nome) return { erro: "Informe o nome completo." };
  if (!telefone) return { erro: "Informe um telefone de contato." };
  if (!endereco) return { erro: "Informe o endereço." };
  if (!numero) return { erro: "Informe o número." };
  if (!chavePix) return { erro: "Informe a chave PIX." };

  const tipoChavePix = detectarTipoChavePix(chavePix);
  if (!chavePixValida(tipoChavePix, chavePix)) {
    return { erro: `A chave PIX não parece válida (detectada como ${tipoChavePix.toLowerCase()}).` };
  }

  await prisma.pessoa.update({
    where: { id: pessoaId },
    data: { nome, telefone, endereco, numero, complemento: complemento || null, chavePix, tipoChavePix },
  });

  revalidatePath(`/freelancers/${pessoaId}`);
  revalidatePath("/freelancers");
  return { sucesso: true };
}
