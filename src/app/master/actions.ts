"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMaster, requireSessao, SESSAO_COOKIE } from "@/lib/auth";
import type { StatusAssinatura } from "@/generated/prisma/enums";

/** Acesso total do master a uma empresa: cria/edita/apaga como se fosse a
 * própria empresa, sem restrição — não é um modo "demonstração". */
export async function acessarEmpresa(empresaId: number) {
  await requireMaster();
  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (!token) redirect("/login");

  await prisma.sessao.update({
    where: { token },
    data: { empresaAtivaId: empresaId },
  });
  revalidatePath("/", "layout");
  redirect("/v2/dashboard");
}

/** Vincula o próprio login do master a uma empresa que já existe (criada
 * por outro usuário, ou sem dono) — pra ela aparecer em "Minhas empresas" e
 * no seletor rápido do dashboard, sem precisar recadastrar nada. Não tira
 * o vínculo de quem já é dono, só adiciona o master como dono também. */
export async function vincularEmpresaAoMeuLogin(empresaId: number) {
  const sessao = await requireMaster();
  await prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: sessao.usuarioId, empresaId } },
    update: {},
    create: { usuarioId: sessao.usuarioId, empresaId },
  });
  revalidatePath("/master");
  revalidatePath("/empresas");
  revalidatePath("/", "layout");
}

/** Exclusão de qualquer empresa pelo master — sem checagem de vínculo, já
 * que o master tem acesso total por definição. */
export async function excluirEmpresaMaster(empresaId: number) {
  await requireMaster();
  await prisma.empresa.delete({ where: { id: empresaId } });
  revalidatePath("/master");
  revalidatePath("/", "layout");
}

/** Exclusão de uma conta de dono — remove só o login (e os vínculos dele
 * com empresas, que ficam "sem dono" se não tiverem outro usuário). Nunca
 * apaga outro master por aqui, mesmo que o id seja forjado. */
export async function excluirUsuarioMaster(usuarioId: number) {
  await requireMaster();
  const alvo = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { isMaster: true },
  });
  if (!alvo || alvo.isMaster) return;
  await prisma.usuario.delete({ where: { id: usuarioId } });
  revalidatePath("/master");
}

export type AtualizarAssinaturaState = { erro?: string; sucesso?: boolean } | undefined;

const STATUS_VALIDOS: StatusAssinatura[] = ["TRIAL", "ATIVA", "ATRASADA", "CANCELADA"];

/** Controle manual do master sobre a assinatura de qualquer empresa —
 * prorrogar, cancelar, reativar, ou ajustar o valor combinado. Sem essa
 * válvula manual, o dono do sistema fica refém do fluxo automático (cron +
 * webhook) pra qualquer exceção comercial (cortesia, negociação,
 * cliente que pagou por fora). */
export async function atualizarAssinaturaEmpresa(
  _prev: AtualizarAssinaturaState,
  formData: FormData
): Promise<AtualizarAssinaturaState> {
  await requireMaster();

  const empresaId = Number(formData.get("empresaId"));
  if (!Number.isInteger(empresaId)) return { erro: "Empresa inválida." };

  const statusAssinatura = String(formData.get("statusAssinatura") ?? "");
  if (!STATUS_VALIDOS.includes(statusAssinatura as StatusAssinatura)) {
    return { erro: "Status inválido." };
  }

  const vencimentoBruto = String(formData.get("assinaturaVenceEm") ?? "").trim();
  let assinaturaVenceEm: Date | null = null;
  if (vencimentoBruto) {
    assinaturaVenceEm = new Date(`${vencimentoBruto}T12:00:00-03:00`);
    if (Number.isNaN(assinaturaVenceEm.getTime())) {
      return { erro: "Informe uma data de vencimento válida, ou deixe em branco." };
    }
  }

  const valorBruto = String(formData.get("valorMensalidade") ?? "").trim().replace(",", ".");
  let valorMensalidade: number | null = null;
  if (valorBruto) {
    valorMensalidade = Number(valorBruto);
    if (!Number.isFinite(valorMensalidade) || valorMensalidade <= 0) {
      return { erro: "Informe um valor de mensalidade válido, ou deixe em branco pro padrão." };
    }
  }

  const splitBruto = String(formData.get("splitPercentualAsaas") ?? "").trim().replace(",", ".");
  let splitPercentualAsaas: number | null = null;
  if (splitBruto) {
    splitPercentualAsaas = Number(splitBruto);
    if (!Number.isFinite(splitPercentualAsaas) || splitPercentualAsaas < 0 || splitPercentualAsaas > 100) {
      return { erro: "O percentual de split precisa estar entre 0 e 100, ou em branco pra desativar." };
    }
  }

  const tabletFornecido = formData.get("tabletFornecido") === "on";
  let tabletValorTotal: number | null = null;
  let tabletParcelasTotal: number | null = null;
  let tabletParcelasPagas = 0;
  if (tabletFornecido) {
    const tabletValorBruto = String(formData.get("tabletValorTotal") ?? "").trim().replace(",", ".");
    tabletValorTotal = Number(tabletValorBruto);
    if (!tabletValorBruto || !Number.isFinite(tabletValorTotal) || tabletValorTotal <= 0) {
      return { erro: "Informe o valor total do tablet." };
    }

    tabletParcelasTotal = Number(formData.get("tabletParcelasTotal"));
    if (
      !Number.isInteger(tabletParcelasTotal) ||
      tabletParcelasTotal < 1 ||
      tabletParcelasTotal > 12
    ) {
      return { erro: "Escolha em quantas parcelas o tablet está sendo pago (1 a 12x)." };
    }

    tabletParcelasPagas = Number(formData.get("tabletParcelasPagas"));
    if (!Number.isInteger(tabletParcelasPagas) || tabletParcelasPagas < 0 || tabletParcelasPagas > tabletParcelasTotal) {
      return { erro: "O número de parcelas já pagas precisa estar entre 0 e o total de parcelas." };
    }
  }

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      statusAssinatura: statusAssinatura as StatusAssinatura,
      assinaturaVenceEm,
      valorMensalidade,
      splitPercentualAsaas,
      tabletFornecido,
      tabletValorTotal,
      tabletParcelasTotal,
      tabletParcelasPagas,
    },
  });

  revalidatePath("/master");
  revalidatePath("/master/assinaturas");
  revalidatePath("/pagamentos");
  return { sucesso: true };
}

export async function voltarParaMaster() {
  const sessao = await requireSessao();
  if (!sessao.isMaster) redirect("/v2/dashboard");

  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (token) {
    await prisma.sessao.update({
      where: { token },
      data: { empresaAtivaId: null },
    });
  }
  revalidatePath("/", "layout");
  redirect("/master");
}
