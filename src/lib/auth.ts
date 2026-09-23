import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { comRetentativaDePool } from "@/lib/retry";
import type { StatusAssinatura } from "@/generated/prisma/enums";

export const SESSAO_COOKIE = "sessao_token";
const SESSAO_TTL_DIAS = 30;

export type SessaoAtual = {
  usuarioId: number;
  email: string;
  isMaster: boolean;
  empresaAtivaId: number | null;
  empresaEfetivoId: number | null;
  empresaEfetivoNome: string | null;
  /// Status de assinatura da empresa efetiva — null pra master (busca à
  /// parte, ver requireTenant) ou quando nenhuma empresa está selecionada.
  /// Consultado direto de minhasEmpresas (já carregado nesta mesma query),
  /// sem round-trip extra ao banco.
  empresaEfetivoStatusAssinatura: StatusAssinatura | null;
  /// Fim da janela da liberação de confiança (ver Empresa no schema) — no
  /// futuro significa painel liberado mesmo com status ATRASADA/CANCELADA.
  /// Mesma ressalva de null pra master que o campo acima.
  empresaEfetivoLiberacaoConfiancaAteEm: Date | null;
  /// Empresa que o MASTER escolheu acessar mesmo bloqueada (botão "Entrar
  /// mesmo assim" em /assinatura) — ver Sessao no schema. Só tem efeito
  /// quando isMaster; irrelevante pro dono normal.
  masterBypassEmpresaId: number | null;
  minhasEmpresas: { id: number; nome: string }[];
};

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function criarSessao(usuarioId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + SESSAO_TTL_DIAS * 24 * 60 * 60 * 1000);
  await prisma.sessao.create({ data: { token, usuarioId, expiraEm } });

  const cookieStore = await cookies();
  cookieStore.set(SESSAO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
  // O layout raiz lê a sessão para decidir nav; sem isso o router
  // client-side reaproveitaria o layout já em cache.
  revalidatePath("/", "layout");
}

export async function destruirSessaoAtual(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_COOKIE)?.value;
  if (token) {
    await prisma.sessao.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSAO_COOKIE);
  revalidatePath("/", "layout");
}

// Memoizado por request: várias chamadas na mesma renderização batem no
// banco só uma vez.
export const getSessao = cache(async (): Promise<SessaoAtual | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_COOKIE)?.value;
  if (!token) return null;

  // Primeira consulta ao banco em TODA página, pra todo usuário logado —
  // se o pool de conexões estiver sob pico (ver src/lib/retry.ts), isso
  // derrubava o layout raiz inteiro com a tela genérica de erro, mesmo sem
  // nenhum problema de verdade além de um soluço passageiro. Reportado
  // pelo Thiago em 2026-09-23: a tela "aparecia do nada", em qualquer
  // página — fazia sentido, já que é literalmente a primeira query de
  // qualquer request autenticada.
  const sessao = await comRetentativaDePool(() =>
    prisma.sessao.findUnique({
      where: { token },
      select: {
        empresaAtivaId: true,
        masterBypassEmpresaId: true,
        expiraEm: true,
        usuario: {
          select: {
            id: true,
            email: true,
            isMaster: true,
            empresas: {
              select: {
                empresa: {
                  select: {
                    id: true,
                    nome: true,
                    statusAssinatura: true,
                    liberacaoConfiancaAteEm: true,
                  },
                },
              },
            },
          },
        },
        empresaAtiva: { select: { nome: true } },
      },
    })
  );
  if (!sessao || sessao.expiraEm < new Date()) return null;

  // Sessão deslizante: perto do vencimento (faltando menos que a metade
  // do TTL), empurra expiraEm mais 30 dias pra frente — só escreve no
  // banco perto do fim, não em toda request. O cookie em si é renovado à
  // parte, no middleware (src/middleware.ts), sem tocar banco nenhum;
  // as duas metades juntas dão o efeito de quem usa todo dia nunca ser
  // derrubado, e quem some ainda vence 30 dias depois do último uso de
  // verdade. Decisão do Thiago em 2026-09-22.
  const diasRestantes = (sessao.expiraEm.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (diasRestantes < SESSAO_TTL_DIAS / 2) {
    const novaExpiracao = new Date(Date.now() + SESSAO_TTL_DIAS * 24 * 60 * 60 * 1000);
    await prisma.sessao.update({ where: { token }, data: { expiraEm: novaExpiracao } }).catch(() => {});
  }

  const minhasEmpresas = sessao.usuario.empresas.map((e) => e.empresa);

  let empresaEfetivoId: number | null;
  let empresaEfetivoNome: string | null;
  let empresaEfetivoStatusAssinatura: StatusAssinatura | null = null;
  let empresaEfetivoLiberacaoConfiancaAteEm: Date | null = null;

  if (sessao.usuario.isMaster) {
    empresaEfetivoId = sessao.empresaAtivaId;
    empresaEfetivoNome = sessao.empresaAtiva?.nome ?? null;
    // Master busca esses dois campos à parte (ver requireTenant) — como
    // ele pode acessar QUALQUER empresa (não só as de minhasEmpresas), não
    // dá pra confiar nessa lista aqui.
  } else if (
    sessao.empresaAtivaId !== null &&
    minhasEmpresas.some((e) => e.id === sessao.empresaAtivaId)
  ) {
    empresaEfetivoId = sessao.empresaAtivaId;
    empresaEfetivoNome = sessao.empresaAtiva?.nome ?? null;
    const empresaAtiva = minhasEmpresas.find((e) => e.id === sessao.empresaAtivaId);
    empresaEfetivoStatusAssinatura = empresaAtiva?.statusAssinatura ?? null;
    empresaEfetivoLiberacaoConfiancaAteEm = empresaAtiva?.liberacaoConfiancaAteEm ?? null;
  } else if (minhasEmpresas.length === 1) {
    // Só uma empresa: não faz sentido pedir escolha, seleciona direto.
    empresaEfetivoId = minhasEmpresas[0].id;
    empresaEfetivoNome = minhasEmpresas[0].nome;
    empresaEfetivoStatusAssinatura = minhasEmpresas[0].statusAssinatura;
    empresaEfetivoLiberacaoConfiancaAteEm = minhasEmpresas[0].liberacaoConfiancaAteEm;
  } else {
    // 0 ou 2+ empresas sem seleção válida: precisa escolher em /empresas.
    empresaEfetivoId = null;
    empresaEfetivoNome = null;
  }

  return {
    usuarioId: sessao.usuario.id,
    email: sessao.usuario.email,
    isMaster: sessao.usuario.isMaster,
    empresaAtivaId: sessao.empresaAtivaId,
    empresaEfetivoId,
    empresaEfetivoNome,
    empresaEfetivoStatusAssinatura,
    empresaEfetivoLiberacaoConfiancaAteEm,
    masterBypassEmpresaId: sessao.masterBypassEmpresaId,
    minhasEmpresas: minhasEmpresas.map((e) => ({ id: e.id, nome: e.nome })),
  };
});

export async function requireSessao(): Promise<SessaoAtual> {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  return sessao;
}

/** Use no topo de toda page/action escopada a uma empresa (funções,
 * freelancers, turnos, pagamentos, totens). Bloqueia o painel (não o
 * totem, que usa resolverTotemAtivo — um gate totalmente separado) quando
 * a empresa efetiva está ATRASADA/CANCELADA.
 *
 * Desde 2026-09-08 isso vale também pras próprias empresas do master — são
 * negócios reais dele, pagam mensalidade igual qualquer cliente. Mas
 * diferente do cliente (que usa a liberação de confiança, 1x por mês),
 * master tem seu PRÓPRIO jeito de entrar mesmo bloqueado: o botão "Entrar
 * mesmo assim" em /assinatura (ver entrarMesmoBloqueado em
 * src/app/assinatura/actions.ts), que grava masterBypassEmpresaId na
 * própria sessão — continua vendo a tela de bloqueio primeiro (útil pra
 * saber que aquela empresa está atrasada), só não fica preso nela.
 * sessao.empresaEfetivoStatusAssinatura é sempre null pra master (ver
 * getSessao acima), então busca o status de verdade direto no banco só
 * nesse caso — pro dono normal usa o campo já carregado na sessão, sem
 * round-trip extra. */
export async function requireTenant(): Promise<
  SessaoAtual & { empresaEfetivoId: number }
> {
  const sessao = await requireSessao();
  if (sessao.empresaEfetivoId === null) {
    redirect(sessao.isMaster ? "/master" : "/v2/empresas");
  }

  let statusAssinaturaEfetivo = sessao.empresaEfetivoStatusAssinatura;
  let liberacaoConfiancaAteEm = sessao.empresaEfetivoLiberacaoConfiancaAteEm;
  if (sessao.isMaster) {
    const empresaMaster = await prisma.empresa.findUnique({
      where: { id: sessao.empresaEfetivoId },
      select: { statusAssinatura: true, liberacaoConfiancaAteEm: true },
    });
    statusAssinaturaEfetivo = empresaMaster?.statusAssinatura ?? null;
    liberacaoConfiancaAteEm = empresaMaster?.liberacaoConfiancaAteEm ?? null;
  }

  // Liberação de confiança (1x por mês, ver solicitarLiberacaoConfianca em
  // src/app/assinatura/actions.ts) destrava o painel por cima do status
  // normal enquanto a janela ainda não passou — sem mexer em
  // statusAssinatura/assinaturaVenceEm, então volta a bloquear sozinho
  // assim que a janela expira, sem precisar de cron nenhum pra isso.
  const liberadoPorConfianca = !!liberacaoConfiancaAteEm && liberacaoConfiancaAteEm > new Date();
  // Bypass exclusivo de master — ver comentário da função acima.
  const liberadoPorMaster = sessao.isMaster && sessao.masterBypassEmpresaId === sessao.empresaEfetivoId;

  if (
    !liberadoPorConfianca &&
    !liberadoPorMaster &&
    (statusAssinaturaEfetivo === "ATRASADA" || statusAssinaturaEfetivo === "CANCELADA")
  ) {
    redirect("/v2/assinatura");
  }
  return sessao as SessaoAtual & { empresaEfetivoId: number };
}

export async function requireMaster(): Promise<SessaoAtual> {
  const sessao = await requireSessao();
  if (!sessao.isMaster) redirect("/v2/dashboard");
  return sessao;
}
