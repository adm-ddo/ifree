import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/// Mesmo TTL de src/lib/auth.ts/auth-pessoa.ts (SESSAO_TTL_DIAS) — não dá
/// pra importar a constante de lá diretamente sem puxar todo o resto
/// desses arquivos junto, então fica duplicado aqui de propósito, igual
/// outras constantes espelhadas neste projeto.
const SESSAO_TTL_DIAS = 30;

/** Metade "cookie" da sessão deslizante (a metade "banco" fica em
 * getSessao/getSessaoPessoa) — Next só deixa dar Set-Cookie em Server
 * Action, Route Handler ou Proxy, nunca de dentro de um Server Component
 * puro (onde getSessao/getSessaoPessoa são chamadas o tempo todo). Só
 * reescreve o cookie já existente com uma validade nova de 30 dias em
 * toda request, então ele nunca vence sozinho enquanto a pessoa estiver
 * navegando. Decisão do Thiago em 2026-09-22.
 *
 * Chama-se `proxy.ts`/`export function proxy` (não `middleware.ts`) —
 * a partir do Next 16 "middleware" foi renomeado pra "proxy" (o nome
 * antigo confundia com middleware do Express); ver
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md. */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  for (const nome of ["sessao_token", "sessao_pessoa_token"]) {
    const valor = request.cookies.get(nome)?.value;
    if (valor) {
      response.cookies.set(nome, valor, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSAO_TTL_DIAS * 24 * 60 * 60,
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest).*)"],
};
