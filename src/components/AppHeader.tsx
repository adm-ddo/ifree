"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import { voltarParaMaster } from "@/app/master/actions";
import { Logo } from "@/components/Logo";

/** Trunca a razão social no próprio texto (não via CSS) — `text-overflow:
 * ellipsis` combinado com este texto (emoji + "·" + fonte Urbanist) produz
 * um artefato visual de renderização no Chromium onde o texto cortado
 * aparece com um "fantasma" sobreposto. Cortar a string antes de chegar no
 * DOM evita o cálculo de clipping do navegador por completo. */
function truncarNome(nome: string, max = 28): string {
  return nome.length > max ? `${nome.slice(0, max).trimEnd()}…` : nome;
}

const navItems = [
  { href: "/dashboard", label: "Painel" },
  { href: "/funcoes", label: "Funções" },
  { href: "/freelancers", label: "Freelancers" },
  { href: "/turnos", label: "Turnos" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/pagamentos", label: "Pagamentos" },
  { href: "/estimativa-clt", label: "Estimativa CLT" },
  { href: "/totens", label: "Totens" },
  { href: "/configuracoes", label: "Configurações" },
];

export default function AppHeader({
  logoHref,
  logado,
  dentroDeTenant,
  masterEmEmpresa,
  mostrarEmpresas,
  mostrarEmpresasMaster,
  isMasterSemEmpresa,
  empresaEfetivoNome,
}: {
  logoHref: string;
  logado: boolean;
  dentroDeTenant: boolean;
  masterEmEmpresa: boolean;
  mostrarEmpresas: boolean;
  mostrarEmpresasMaster: boolean;
  isMasterSemEmpresa: boolean;
  empresaEfetivoNome: string | null;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  const temMenu = logado;

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link
          href={logoHref}
          onClick={() => setMenuAberto(false)}
          className="flex items-center gap-2 shrink-0"
        >
          <Logo size={34} />
        </Link>

        {dentroDeTenant && (
          <nav className="hidden xl:flex gap-3 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-stone-500 hover:text-brand-700 font-medium transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div
          className={`ml-auto items-center gap-4 text-sm ${
            logado ? "hidden xl:flex" : "flex"
          }`}
        >
          <HeaderExtras
            masterEmEmpresa={masterEmEmpresa}
            mostrarEmpresas={mostrarEmpresas}
            mostrarEmpresasMaster={mostrarEmpresasMaster}
            isMasterSemEmpresa={isMasterSemEmpresa}
            empresaEfetivoNome={empresaEfetivoNome}
            logado={logado}
          />
        </div>

        {temMenu && (
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            className="ml-auto xl:hidden -mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-stone-600 active:bg-stone-100"
          >
            {menuAberto ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            )}
          </button>
        )}
      </div>

      {temMenu && menuAberto && (
        <div className="xl:hidden border-t border-stone-200 bg-white px-4 py-3 flex flex-col gap-1">
          {dentroDeTenant &&
            navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAberto(false)}
                className={`rounded-lg px-3 py-3 text-base font-medium ${
                  pathname === item.href
                    ? "bg-brand-50 text-brand-700"
                    : "text-stone-700 active:bg-stone-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          <div className="border-t border-stone-200 mt-1 pt-2 flex flex-col gap-1 text-sm">
            <HeaderExtras
              masterEmEmpresa={masterEmEmpresa}
              mostrarEmpresas={mostrarEmpresas}
              mostrarEmpresasMaster={mostrarEmpresasMaster}
              isMasterSemEmpresa={isMasterSemEmpresa}
              empresaEfetivoNome={empresaEfetivoNome}
              logado={logado}
              empilhado
              onNavigate={() => setMenuAberto(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
}

function HeaderExtras({
  masterEmEmpresa,
  mostrarEmpresas,
  mostrarEmpresasMaster,
  isMasterSemEmpresa,
  empresaEfetivoNome,
  logado,
  empilhado = false,
  onNavigate,
}: {
  masterEmEmpresa: boolean;
  mostrarEmpresas: boolean;
  mostrarEmpresasMaster: boolean;
  isMasterSemEmpresa: boolean;
  empresaEfetivoNome: string | null;
  logado: boolean;
  empilhado?: boolean;
  onNavigate?: () => void;
}) {
  const linkClasses = empilhado
    ? "rounded-lg px-3 py-3 text-base font-medium text-stone-700 active:bg-stone-100"
    : "text-stone-500 hover:text-brand-700 font-medium transition-colors whitespace-nowrap";

  const nomeCurto = empresaEfetivoNome ? truncarNome(empresaEfetivoNome) : null;

  return (
    <>
      {masterEmEmpresa && (
        // Sem o nome da empresa aqui de propósito — ela já aparece como
        // título da página logo abaixo do cabeçalho; repetir uma razão
        // social (que pode ser bem longa) num botão tão estreito é
        // redundante e foi o que causava o cabeçalho estourar a largura.
        <form action={voltarParaMaster}>
          <button
            type="submit"
            className={
              empilhado
                ? "w-full text-left rounded-lg bg-brand-50 text-brand-700 border border-brand-200 px-3 py-3 font-medium"
                : "rounded-full bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1 font-medium hover:bg-brand-100 transition-colors whitespace-nowrap"
            }
          >
            🏢 Voltar ao painel master
          </button>
        </form>
      )}
      {mostrarEmpresas && (
        <Link href="/empresas" onClick={onNavigate} className={linkClasses}>
          🏢 {nomeCurto ?? "Trocar empresa"}
        </Link>
      )}
      {isMasterSemEmpresa && (
        <Link href="/master" onClick={onNavigate} className={linkClasses}>
          Master
        </Link>
      )}
      {mostrarEmpresasMaster && (
        <Link href="/empresas" onClick={onNavigate} className={linkClasses}>
          🏢 Minhas empresas
        </Link>
      )}
      {logado && (
        <Link href="/meus-dados" onClick={onNavigate} className={linkClasses}>
          Meus dados
        </Link>
      )}
      {logado && (
        <form action={logout}>
          <button
            type="submit"
            className={
              empilhado
                ? "w-full text-left rounded-lg px-3 py-3 text-base font-medium text-stone-700 active:bg-stone-100"
                : "text-stone-500 hover:text-navy-900"
            }
          >
            Sair
          </button>
        </form>
      )}
      {!logado && (
        <Link href="/login" onClick={onNavigate} className={linkClasses}>
          Entrar
        </Link>
      )}
    </>
  );
}
