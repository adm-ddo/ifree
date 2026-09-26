import Link from "next/link";
import type { Metadata } from "next";
import { getSessaoPessoa } from "@/lib/auth-pessoa";
import { logoutPessoa } from "@/lib/auth-pessoa-actions";

/// Faz "Adicionar à tela inicial" a partir de qualquer página /portal/**
/// instalar como "iFREE Conecta" (ver manifest.webmanifest/route.ts logo
/// ao lado) em vez do manifest genérico do site inteiro (src/app/manifest.ts,
/// que herdaria por padrão sem isso). appleWebApp cobre o Safari do iOS,
/// que ignora bastante coisa do manifest.json e só reage a esses
/// <meta name="apple-mobile-web-app-*"> específicos.
export const metadata: Metadata = {
  manifest: "/portal/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "iFREE Conecta",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/brand/icones-app/icon-conecta-180.png",
  },
};

/** Header próprio do Portal (iFREE Conecta) — não é o AppHeader do painel
 * admin (ChromeGate esconde ele nessa rota). Precisa funcionar tanto
 * deslogado (entrar/cadastrar-acesso/redefinir-senha) quanto logado (home
 * do Portal), por isso lê a sessão aqui em vez de assumir uma delas. */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await getSessaoPessoa();

  return (
    <div className="min-h-full flex flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href={sessao ? "/portal" : "/"} className="flex items-center gap-2 shrink-0 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- ícone estático pequeno do public/, next/image não compensa aqui */}
            <img
              src="/brand/icones-app/icon-conecta-192.png"
              alt="iFREE Conecta"
              className="h-9 w-9 rounded-xl shrink-0"
            />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-navy-900 text-sm truncate">iFREE Conecta</span>
              <span className="text-[10px] text-stone-500 truncate">Entrou, trabalhou, recebeu.</span>
            </span>
          </Link>
          {sessao && (
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-stone-500 hidden sm:inline truncate max-w-[10rem]">
                {sessao.nome.split(" ")[0]}
              </span>
              <form action={logoutPessoa}>
                <button
                  type="submit"
                  className="text-stone-500 hover:text-navy-900 font-medium"
                >
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      <div className="flex-1 flex flex-col mx-auto w-full max-w-3xl px-4 py-8">
        {children}
      </div>
    </div>
  );
}
