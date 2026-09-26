import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
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
          <Link href={sessao ? "/portal" : "/"} className="flex items-center gap-2 shrink-0">
            <Logo size={30} />
          </Link>
          <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-wide text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2.5 py-1">
            Portal do freelancer
          </span>
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
