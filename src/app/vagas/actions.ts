"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { normalizarTags } from "@/lib/habilidades";
import { uploadDataUrl } from "@/lib/blob";
import { notificarPessoasSobreVagaNova } from "@/lib/match-passivo";
import { enviarEmailConviteVaga } from "@/lib/email";
import { revalidatePath } from "next/cache";
import {
  JANELA_RECENTE_HORAS,
  JANELA_MAXIMA_HORAS,
  CANDIDATOS_POR_PAGINA,
  type BuscarMaisCandidatosResultado,
} from "./candidatosCompativeis";

export type NovaVagaState = { erro?: string; sucesso?: boolean } | undefined;

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
  const funcaoId = Number(formData.get("funcaoId"));
  const descricao = String(formData.get("descricao") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const nomeFantasia = String(formData.get("nomeFantasia") ?? "").trim();
  const habilidadesProcuradas = normalizarTags(formData.getAll("habilidadesProcuradas"));
  const turnoDia = formData.get("turnoDia") === "on";
  const turnoNoite = formData.get("turnoNoite") === "on";
  const logoDataUrl = String(formData.get("logoDataUrl") ?? "").trim();
  const possibilidadeEfetivacao = formData.get("possibilidadeEfetivacao") === "on";

  if (!Number.isInteger(funcaoId)) return { erro: "Escolha a função da vaga." };
  if (!descricao) return { erro: "Descreva a vaga." };
  if (descricao.length > 4000) return { erro: "A descrição pode ter no máximo 4000 caracteres." };
  if (localizacao.length > 150) return { erro: "A localização pode ter no máximo 150 caracteres." };
  if (nomeFantasia.length > 100) return { erro: "O nome fantasia pode ter no máximo 100 caracteres." };
  if (!turnoDia && !turnoNoite) return { erro: "Selecione pelo menos um turno (dia ou noite)." };

  // Nunca confia no cargo/valor vindo do client — sempre deriva da própria
  // Funcao no servidor (ela já garante empresaId+ativo), e congela os dois
  // na Vaga como retrato do momento da publicação (mesmo espírito de
  // Turno.valorHoraAplicado): se a empresa editar o valor da função depois,
  // vagas já publicadas continuam mostrando o valor combinado na hora.
  const funcao = await prisma.funcao.findFirst({
    where: { id: funcaoId, empresaId: sessao.empresaEfetivoId, ativo: true },
    select: { nome: true, valorHoraPadrao: true },
  });
  if (!funcao) return { erro: "Função inválida — escolha uma das funções cadastradas." };

  // logoDataUrl é opcional — vazio (padrão) usa o ícone ilustrado da
  // categoria (ver CATEGORIA_INFO em VagaCard.tsx), nunca bloqueia a
  // publicação por conta disso.
  const logoUrl = logoDataUrl.startsWith("data:image/")
    ? await uploadDataUrl(`vagas/logo-${Date.now()}.jpg`, logoDataUrl)
    : null;

  const novaVaga = await prisma.vaga.create({
    data: {
      empresaId: sessao.empresaEfetivoId,
      cargo: funcao.nome,
      funcaoId,
      valorHora: funcao.valorHoraPadrao,
      categoria,
      logoUrl,
      possibilidadeEfetivacao,
      descricao,
      localizacao: localizacao || null,
      nomeFantasia: nomeFantasia || null,
      habilidadesProcuradas,
      turnoDia,
      turnoNoite,
      criadoPorEmail: sessao.email,
    },
  });

  // Avisa por e-mail quem já tem perfil compatível com essa vaga nova,
  // antes mesmo de alguém se candidatar (ver src/lib/match-passivo.ts) —
  // a vaga já foi criada com sucesso acima, então isso nunca pode travar
  // a publicação nem devolver erro pra quem publicou.
  try {
    await notificarPessoasSobreVagaNova(novaVaga.id);
  } catch (err) {
    console.error("Falha ao notificar pessoas sobre vaga nova:", err);
  }

  revalidatePath("/vagas");
  return { sucesso: true };
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

  const descricao = String(formData.get("descricao") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const nomeFantasia = String(formData.get("nomeFantasia") ?? "").trim();
  const habilidadesProcuradas = normalizarTags(formData.getAll("habilidadesProcuradas"));
  const turnoDia = formData.get("turnoDia") === "on";
  const turnoNoite = formData.get("turnoNoite") === "on";

  if (!descricao) return { erro: "Descreva a vaga." };
  if (descricao.length > 4000) return { erro: "A descrição pode ter no máximo 4000 caracteres." };
  if (localizacao.length > 150) return { erro: "A localização pode ter no máximo 150 caracteres." };
  if (nomeFantasia.length > 100) return { erro: "O nome fantasia pode ter no máximo 100 caracteres." };
  if (!turnoDia && !turnoNoite) return { erro: "Selecione pelo menos um turno (dia ou noite)." };

  await prisma.vaga.update({
    where: { id: vagaId },
    data: {
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

export type ConvidarParaVagaResultado = { sucesso: true } | { erro: string };

/** Convite explícito pra um candidato de "match passivo" (perfil bate com
 * a vaga, mas ele nunca se candidatou) — antes disso o banner
 * (MatchesRecentesBanner.tsx) só mostrava o nome parado, sem nenhuma ação
 * possível (reportado pelo Thiago em 2026-09-26: "não serve pra nada").
 * Sem reenvio de propósito (convidadoEm marcado na hora) — clicar de novo
 * não manda outro e-mail, pra não virar spam pro freelancer. */
export async function convidarParaVaga(matchPassivoId: number): Promise<ConvidarParaVagaResultado> {
  const sessao = await requireModulo("vagas");

  const match = await prisma.vagaMatchPassivo.findUnique({
    where: { id: matchPassivoId },
    select: {
      convidadoEm: true,
      vaga: { select: { empresaId: true, cargo: true, nomeFantasia: true, empresa: { select: { nome: true } } } },
      pessoa: { select: { nome: true, email: true } },
    },
  });
  if (!match || match.vaga.empresaId !== sessao.empresaEfetivoId) {
    return { erro: "Esse candidato não pertence a uma vaga desta empresa." };
  }
  if (match.convidadoEm) return { erro: "Convite já enviado." };
  if (!match.pessoa.email) return { erro: "Esse freelancer não tem e-mail cadastrado." };

  const empresaNome = match.vaga.nomeFantasia || match.vaga.empresa.nome;
  const { sucesso } = await enviarEmailConviteVaga(match.pessoa.email, match.pessoa.nome, match.vaga.cargo, empresaNome);
  if (!sucesso) return { erro: "Não foi possível enviar o convite agora — tenta de novo." };

  await prisma.vagaMatchPassivo.update({ where: { id: matchPassivoId }, data: { convidadoEm: new Date() } });
  revalidatePath("/vagas");
  return { sucesso: true };
}

/** Busca paginada de candidatos compatíveis MAIS ANTIGOS que a janela
 * recente do banner (entre 24h e 72h de idade) — botão "Buscar mais
 * pessoas compatíveis", só carrega quando clicado (CandidatosCompativeis
 * Expandido.tsx), 10 por página pra não devolver uma lista gigante de
 * uma vez. */
export async function buscarMaisCandidatosCompativeis(pagina: number): Promise<BuscarMaisCandidatosResultado> {
  const sessao = await requireModulo("vagas");
  const agora = Date.now();
  const desde = new Date(agora - JANELA_MAXIMA_HORAS * 60 * 60 * 1000);
  const ate = new Date(agora - JANELA_RECENTE_HORAS * 60 * 60 * 1000);
  const paginaValida = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;

  // pessoa.disponivelParaOportunidades:true de propósito — mesmo motivo
  // do MatchesRecentesBanner.tsx: quem já combinou um Extra Marcado some
  // das buscas de outras empresas até reativar manualmente.
  const where = {
    vaga: { empresaId: sessao.empresaEfetivoId },
    criadoEm: { gte: desde, lt: ate },
    pessoa: { disponivelParaOportunidades: true },
  } as const;

  const [itens, total] = await Promise.all([
    prisma.vagaMatchPassivo.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (paginaValida - 1) * CANDIDATOS_POR_PAGINA,
      take: CANDIDATOS_POR_PAGINA,
      select: {
        id: true,
        convidadoEm: true,
        pessoa: { select: { id: true, nome: true } },
        vaga: { select: { id: true, cargo: true } },
      },
    }),
    prisma.vagaMatchPassivo.count({ where }),
  ]);

  return {
    itens: itens.map((m) => ({
      id: m.id,
      pessoaId: m.pessoa.id,
      pessoaNome: m.pessoa.nome,
      vagaId: m.vaga.id,
      vagaCargo: m.vaga.cargo,
      convidadoEm: m.convidadoEm ? m.convidadoEm.toISOString() : null,
    })),
    totalPaginas: Math.max(1, Math.ceil(total / CANDIDATOS_POR_PAGINA)),
    paginaAtual: paginaValida,
  };
}
