import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Login da Pessoa no Portal (iFREE Conecta) — deliberadamente separado
 * do login do dono (src/lib/auth.ts, Usuario/Sessao/TokenAutenticacao).
 * Mesmo espírito de manter Turno/RegistroPonto sempre em tabelas próprias
 * neste projeto: zero risco de qualquer mudança aqui afetar o login do
 * dono, que empresas pagantes já dependem hoje. hashSenha/verificarSenha
 * (bcrypt) continuam vindo de src/lib/auth.ts — são genéricas, sem nada
 * específico de Usuario. */
export const SESSAO_PESSOA_COOKIE = "sessao_pessoa_token";
const SESSAO_TTL_DIAS = 30;

export type SessaoPessoaAtual = {
  pessoaId: number;
  nome: string;
  documento: string;
};

export async function criarSessaoPessoa(pessoaId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + SESSAO_TTL_DIAS * 24 * 60 * 60 * 1000);
  await prisma.sessaoPessoa.create({ data: { token, pessoaId, expiraEm } });

  const cookieStore = await cookies();
  cookieStore.set(SESSAO_PESSOA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
  revalidatePath("/portal", "layout");
}

export async function destruirSessaoPessoaAtual(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_PESSOA_COOKIE)?.value;
  if (token) {
    await prisma.sessaoPessoa.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSAO_PESSOA_COOKIE);
  revalidatePath("/portal", "layout");
}

// Memoizado por request: várias chamadas na mesma renderização batem no
// banco só uma vez.
export const getSessaoPessoa = cache(async (): Promise<SessaoPessoaAtual | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSAO_PESSOA_COOKIE)?.value;
  if (!token) return null;

  const sessao = await prisma.sessaoPessoa.findUnique({
    where: { token },
    select: {
      expiraEm: true,
      pessoa: { select: { id: true, nome: true, documento: true } },
    },
  });
  if (!sessao || sessao.expiraEm < new Date()) return null;

  return { pessoaId: sessao.pessoa.id, nome: sessao.pessoa.nome, documento: sessao.pessoa.documento };
});

export async function requirePessoa(): Promise<SessaoPessoaAtual> {
  const sessao = await getSessaoPessoa();
  if (!sessao) redirect("/portal/entrar");
  return sessao;
}

/** Use no topo de toda page/rota do Portal que mostra ou gera dado de
 * perfil (home, PDF do currículo) — /portal/termos em si usa requirePessoa
 * puro, senão ninguém conseguiria chegar lá pra aceitar. */
export async function requirePessoaComTermosAceitos(): Promise<SessaoPessoaAtual> {
  const sessao = await requirePessoa();
  const pessoa = await prisma.pessoa.findUnique({
    where: { id: sessao.pessoaId },
    select: { termosAceitosEm: true },
  });
  if (!pessoa?.termosAceitosEm) redirect("/portal/termos");
  return sessao;
}
