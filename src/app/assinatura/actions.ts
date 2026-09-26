"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSessao, requireMaster, SESSAO_COOKIE } from "@/lib/auth";
import { cobrancaService } from "@/lib/cobranca";
import { revalidatePath } from "next/cache";
import {
  valorMensalidadeEfetivo,
  referenciaMesAtual,
  LIBERACAO_CONFIANCA_HORAS,
  podeUsarLiberacaoConfianca,
  valorParcelaTabletPendente,
} from "@/lib/assinatura";

export type GerarCobrancaState =
  | { erro: string }
  | { sucesso: true; idTransacaoExterna: string; qrCode: string; qrCodeImagemUrl: string | null; expiraEm: string }
  | undefined;

/** Gera (ou reaproveita, se já existir uma válida do mesmo mês) o PIX da
 * mensalidade — chamada pelo botão em /assinatura. Nunca confia no
 * empresaId vindo do cliente sem checar que a sessão realmente pertence a
 * essa empresa (mesmo cuidado de qualquer action escopada a tenant, só que
 * aqui não dá pra usar requireTenant — é o ponto de fuga do próprio
 * bloqueio que requireTenant aplica). Retorna { erro } em vez de lançar
 * exceção — chamada direto pelo client, mesmo motivo documentado em
 * src/app/freelancers/actions.ts::converterParaClt. */
export async function gerarCobrancaMensalidade(empresaId: number): Promise<GerarCobrancaState> {
  const sessao = await requireSessao();
  const pertence =
    sessao.isMaster || sessao.minhasEmpresas.some((e) => e.id === empresaId);
  if (!pertence) return { erro: "Essa empresa não pertence a este login." };

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      valorMensalidade: true,
      planoEmpresa: true,
      planoCompletoDesde: true,
      tabletFornecido: true,
      tabletValorTotal: true,
      tabletParcelasTotal: true,
      tabletParcelasPagas: true,
    },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  const referenciaMes = referenciaMesAtual();

  const existente = await prisma.cobrancaMensalidade.findFirst({
    where: {
      empresaId,
      referenciaMes,
      status: "PENDENTE",
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: "desc" },
  });
  if (existente && existente.qrCode && existente.idTransacaoExterna) {
    return {
      sucesso: true,
      idTransacaoExterna: existente.idTransacaoExterna,
      qrCode: existente.qrCode,
      qrCodeImagemUrl: existente.qrCodeImagemUrl,
      expiraEm: existente.expiraEm.toISOString(),
    };
  }

  const valorMensalidade = valorMensalidadeEfetivo({
    valorMensalidade: empresa.valorMensalidade !== null ? Number(empresa.valorMensalidade) : null,
    planoEmpresa: empresa.planoEmpresa,
    planoCompletoDesde: empresa.planoCompletoDesde,
  });
  // Soma a parcela do tablet (se a empresa tiver um ativo e ainda não
  // quitado) direto no valor do Pix — ver valorParcelaTabletPendente em
  // src/lib/assinatura.ts. valorTablet fica gravado à parte só pra
  // discriminar na tela depois (GerarPixForm/página de assinatura) e pro
  // confirmarCobrancaPaga saber se incrementa tabletParcelasPagas.
  const valorTablet = valorParcelaTabletPendente({
    tabletFornecido: empresa.tabletFornecido,
    tabletValorTotal: empresa.tabletValorTotal !== null ? Number(empresa.tabletValorTotal) : null,
    tabletParcelasTotal: empresa.tabletParcelasTotal,
    tabletParcelasPagas: empresa.tabletParcelasPagas,
  });
  const valor = valorMensalidade + (valorTablet ?? 0);

  const resultado = await cobrancaService().criarCobrancaPix({ empresaId, valor, referenciaMes });
  if (!resultado.sucesso) {
    return { erro: `Não foi possível gerar o PIX agora: ${resultado.erro}` };
  }

  await prisma.cobrancaMensalidade.create({
    data: {
      empresaId,
      valor,
      valorTablet,
      referenciaMes,
      idTransacaoExterna: resultado.idTransacaoExterna,
      qrCode: resultado.qrCode,
      qrCodeImagemUrl: resultado.qrCodeImagemUrl,
      expiraEm: resultado.expiraEm,
    },
  });

  return {
    sucesso: true,
    idTransacaoExterna: resultado.idTransacaoExterna,
    qrCode: resultado.qrCode,
    qrCodeImagemUrl: resultado.qrCodeImagemUrl,
    expiraEm: resultado.expiraEm.toISOString(),
  };
}

export type LiberacaoConfiancaState = { erro: string } | { sucesso: true } | undefined;

/** Libera o painel por LIBERACAO_CONFIANCA_HORAS sem exigir pagamento —
 * 1x POR MÊS por empresa (não por vida da empresa — decisão do Thiago em
 * 2026-09-08), pensado pra não cortar o acesso na hora exata em que o
 * cliente atrasa. Não mexe em statusAssinatura/assinaturaVenceEm (o ciclo
 * de cobrança normal continua intacto) — só abre uma janela temporária que
 * requireTenant/layout.tsx checam por cima do bloqueio normal. Mesmo
 * cuidado de checar a posse da empresa que gerarCobrancaMensalidade acima
 * (não dá pra usar requireTenant aqui, é o ponto de fuga do próprio
 * bloqueio). */
export async function solicitarLiberacaoConfianca(empresaId: number): Promise<LiberacaoConfiancaState> {
  const sessao = await requireSessao();
  const pertence = sessao.isMaster || sessao.minhasEmpresas.some((e) => e.id === empresaId);
  if (!pertence) return { erro: "Essa empresa não pertence a este login." };

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { liberacaoConfiancaUsadaEm: true },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };
  if (!podeUsarLiberacaoConfianca(empresa.liberacaoConfiancaUsadaEm)) {
    return { erro: "Essa empresa já usou a liberação de confiança este mês — agora só libera pagando." };
  }

  const agora = new Date();
  const ateEm = new Date(agora.getTime() + LIBERACAO_CONFIANCA_HORAS * 60 * 60 * 1000);
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { liberacaoConfiancaUsadaEm: agora, liberacaoConfiancaAteEm: ateEm },
  });

  revalidatePath("/", "layout");
  revalidatePath("/assinatura");
  revalidatePath("/v2/assinatura");
  return { sucesso: true };
}

/** Bypass exclusivo de master: entra na empresa mesmo com assinatura
 * ATRASADA/CANCELADA, sem usar nem afetar a liberação de confiança (essa é
 * exclusiva do cliente). Grava masterBypassEmpresaId na própria sessão
 * (ver requireTenant em src/lib/auth.ts) — continua valendo enquanto a
 * sessão existir, não precisa clicar de novo a cada visita à mesma
 * empresa. requireMaster (não requireSessao) garante que só master
 * consegue chamar isto, mesmo que alguém tente direto via devtools. */
export async function entrarMesmoBloqueado(empresaId: number): Promise<never> {
  await requireMaster();
  const token = (await cookies()).get(SESSAO_COOKIE)?.value;
  if (!token) redirect("/login");

  await prisma.sessao.update({
    where: { token },
    data: { masterBypassEmpresaId: empresaId },
  });
  revalidatePath("/", "layout");
  redirect("/v2/dashboard");
}
