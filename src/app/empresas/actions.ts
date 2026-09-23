"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessao, SESSAO_COOKIE } from "@/lib/auth";
import { lerDadosEmpresa, type DadosEmpresaState } from "@/lib/empresa";
import { TRIAL_DIAS } from "@/lib/assinatura";
import { enviarEmailNovoCadastro } from "@/lib/email";

export async function selecionarEmpresa(empresaId: number) {
  const sessao = await requireSessao();

  // Checagem de posse: só pode selecionar uma empresa que realmente é sua.
  // sessao.minhasEmpresas já veio carregado por requireSessao (getSessao) —
  // conferir em memória evita uma segunda ida ao banco só pra repetir a
  // mesma pergunta, o que importa aqui porque troca de empresa é um
  // caminho sensível a latência (o usuário está esperando na hora).
  if (!sessao.minhasEmpresas.some((e) => e.id === empresaId)) {
    throw new Error("Essa empresa não pertence a este login.");
  }

  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (!token) redirect("/login");

  await prisma.sessao.update({
    where: { token },
    data: { empresaAtivaId: empresaId },
  });
  revalidatePath("/", "layout");
  redirect("/v2/dashboard");
}

export type NovaEmpresaState = DadosEmpresaState;

export async function cadastrarNovaEmpresa(
  _prev: NovaEmpresaState,
  formData: FormData
): Promise<NovaEmpresaState> {
  const sessao = await requireSessao();

  const resultado = lerDadosEmpresa(formData);
  if ("erro" in resultado) return resultado;

  if (formData.get("aceitouTermos") !== "on") {
    return { erro: "Você precisa aceitar os Termos de Uso e a Política de Privacidade pra continuar." };
  }

  const trialVenceEm = new Date(Date.now() + TRIAL_DIAS * 24 * 60 * 60 * 1000);

  const empresa = await prisma.$transaction(async (tx) => {
    const novaEmpresa = await tx.empresa.create({
      data: {
        ...resultado.dados,
        statusAssinatura: "TRIAL",
        assinaturaVenceEm: trialVenceEm,
        termosAceitosEm: new Date(),
      },
    });
    // responsavelEtica: true — quem cria a empresa é o dono, mantém acesso
    // à Central de Ética por padrão (mesmo espírito do backfill da
    // migração: ninguém fica sem acesso à própria empresa por padrão, só
    // logins secundários criados depois em /equipe nascem sem a marcação).
    await tx.usuarioEmpresa.create({
      data: { usuarioId: sessao.usuarioId, empresaId: novaEmpresa.id, responsavelEtica: true },
    });
    return novaEmpresa;
  });

  // Avisa o dono do sistema — nunca lança se falhar, não pode travar o
  // cadastro de quem está se cadastrando.
  if (process.env.MASTER_EMAIL) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: sessao.usuarioId },
      select: { nomeCompleto: true, email: true },
    });
    await enviarEmailNovoCadastro(process.env.MASTER_EMAIL, {
      nomeEmpresa: empresa.nome,
      cnpj: empresa.cnpj,
      nomeDono: usuario?.nomeCompleto ?? "—",
      emailDono: usuario?.email ?? sessao.email,
    });
  }

  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (token) {
    await prisma.sessao.update({
      where: { token },
      data: { empresaAtivaId: empresa.id },
    });
  }

  revalidatePath("/", "layout");
  redirect("/v2/dashboard");
}

export async function removerEmpresa(empresaId: number) {
  const sessao = await requireSessao();

  await prisma.usuarioEmpresa.deleteMany({
    where: { usuarioId: sessao.usuarioId, empresaId },
  });

  // Se a empresa removida era a ativa nesta sessão, limpa a seleção.
  if (sessao.empresaAtivaId === empresaId) {
    const token = (await cookies()).get(SESSAO_COOKIE)?.value;
    if (token) {
      await prisma.sessao.update({
        where: { token },
        data: { empresaAtivaId: null },
      });
    }
  }

  revalidatePath("/empresas");
  revalidatePath("/v2/empresas");
  revalidatePath("/", "layout");
}

/** Apaga a empresa de verdade (funções, totens, turnos, pagamentos — tudo
 * junto, via cascata do schema). Diferente de removerEmpresa, que só tira o
 * vínculo deste login sem mexer nos dados. */
export async function excluirEmpresa(empresaId: number) {
  const sessao = await requireSessao();

  // Checagem de posse: só quem tem vínculo com essa empresa pode apagar.
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId: sessao.usuarioId, empresaId } },
  });
  if (!vinculo) {
    throw new Error("Essa empresa não pertence a este login.");
  }

  await prisma.empresa.delete({ where: { id: empresaId } });

  revalidatePath("/empresas");
  revalidatePath("/v2/empresas");
  revalidatePath("/", "layout");
}
