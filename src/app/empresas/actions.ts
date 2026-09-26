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
        // Todo cadastro novo nasce no plano Conecta (só vagas/conversas,
        // ver src/lib/assinatura.ts e o plano "iFREE Conecta") — vira
        // Completo só via upgrade explícito (fazerUpgradeParaCompleto,
        // src/app/v2/upgrade/actions.ts) ou ajuste manual do master.
        planoEmpresa: "CONECTA",
        termosAceitosEm: new Date(),
      },
    });
    // Preenche modulosPermitidos do dono já na criação — sem isso
    // requireModulo (src/lib/requireModulo.ts) bloqueia até o próprio
    // dono de todo módulo, já que o campo nasce como array vazio (bug
    // real encontrado ao planejar esta feature: nenhuma empresa
    // cadastrada desde 23/09/2026, quando o campo modulosPermitidos
    // nasceu, tinha módulo nenhum liberado pro próprio dono). Conecta
    // ganha só vagas/conversas (o resto — funcionários, turnos, totens
    // etc. — é exclusivo do plano Completo, ver upgrade). Mesmo raciocínio
    // de responsavelEtica/Ged/Pgr abaixo: true só faz sentido pra quem já
    // usa o restante das telas de RH/CLT, sem sentido no Conecta.
    await tx.usuarioEmpresa.create({
      data: {
        usuarioId: sessao.usuarioId,
        empresaId: novaEmpresa.id,
        modulosPermitidos: ["vagas", "conversas"],
        responsavelEtica: false,
        responsavelGed: false,
        responsavelPgr: false,
      },
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

export type GrupoEconomicoState = { erro?: string; sucesso?: boolean } | undefined;

/** Cria ou edita o grupo econômico entre empresas do PRÓPRIO login —
 * permite que um funcionário CLT marcado como flutuante
 * (VinculoPessoaEmpresa.podeBaterPontoNoGrupo) bata ponto em qualquer
 * empresa do grupo (ver resolverVinculoCltComGrupo em
 * src/app/t/[token]/actions.ts). Auto-serviço: quem já é admin de 2+
 * empresas prova que são do mesmo dono, não precisa do master aprovar.
 *
 * Semântica de "substituir tudo": reaproveita um grupo já existente entre
 * as empresas selecionadas (se houver), ou cria um novo; empresas DESTE
 * login que tinham esse grupo mas não foram marcadas desta vez saem dele
 * (nunca mexe numa empresa de outro dono que porventura compartilhe o
 * grupo — só quem já é admin dela consegue tirá-la). Grupo que fica sem
 * nenhuma empresa é apagado. */
export async function salvarGrupoEconomico(
  _prev: GrupoEconomicoState,
  formData: FormData
): Promise<GrupoEconomicoState> {
  const sessao = await requireSessao();

  const nome = String(formData.get("nome") ?? "").trim();
  const empresaIds = formData.getAll("empresaIds").map(Number).filter(Number.isInteger);

  if (empresaIds.length < 2) {
    return { erro: "Selecione pelo menos 2 empresas pra formar um grupo." };
  }
  if (!nome) {
    return { erro: "Dê um nome pro grupo." };
  }

  const vinculos = await prisma.usuarioEmpresa.findMany({
    where: { usuarioId: sessao.usuarioId, empresaId: { in: empresaIds } },
    select: { empresaId: true, admin: true, empresa: { select: { grupoEconomicoId: true } } },
  });
  if (vinculos.length !== empresaIds.length || vinculos.some((v) => !v.admin)) {
    return { erro: "Você precisa ser admin de todas as empresas selecionadas." };
  }

  const grupoExistenteId = vinculos.map((v) => v.empresa.grupoEconomicoId).find((id) => id !== null) ?? null;

  await prisma.$transaction(async (tx) => {
    const grupo = grupoExistenteId
      ? await tx.grupoEconomico.update({ where: { id: grupoExistenteId }, data: { nome } })
      : await tx.grupoEconomico.create({ data: { nome } });

    await tx.empresa.updateMany({
      where: { id: { in: empresaIds } },
      data: { grupoEconomicoId: grupo.id },
    });

    // Empresas DESTE usuário que estavam nesse grupo mas ficaram de fora da
    // seleção desta vez — saem do grupo. Nunca toca empresa de outro dono.
    const minhasEmpresasIds = (
      await tx.usuarioEmpresa.findMany({
        where: { usuarioId: sessao.usuarioId },
        select: { empresaId: true },
      })
    ).map((v) => v.empresaId);
    await tx.empresa.updateMany({
      where: {
        id: { in: minhasEmpresasIds, notIn: empresaIds },
        grupoEconomicoId: grupo.id,
      },
      data: { grupoEconomicoId: null },
    });

    const restantes = await tx.empresa.count({ where: { grupoEconomicoId: grupo.id } });
    if (restantes === 0) {
      await tx.grupoEconomico.delete({ where: { id: grupo.id } });
    }
  });

  revalidatePath("/empresas");
  revalidatePath("/v2/empresas");
  return { sucesso: true };
}
