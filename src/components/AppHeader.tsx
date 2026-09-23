"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/vagas", label: "Vagas" },
  { href: "/conversas", label: "Mensagens" },
  { href: "/funcionarios", label: "Funcionários" },
  { href: "/turnos", label: "Turnos" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/pagamentos", label: "Pagamentos" },
  { href: "/financeiro", label: "Financeiro" },
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
  responsavelEtica,
  responsavelGed,
  vagasAlertaCount = 0,
}: {
  logoHref: string;
  logado: boolean;
  dentroDeTenant: boolean;
  masterEmEmpresa: boolean;
  mostrarEmpresas: boolean;
  mostrarEmpresasMaster: boolean;
  isMasterSemEmpresa: boolean;
  empresaEfetivoNome: string | null;
  responsavelEtica: boolean;
  responsavelGed: boolean;
  /// Candidaturas aguardando resposta + mensagens não lidas do iFREE
  /// Conecta — mostrado como numerozinho em cima do nav "Vagas" (o dono
  /// pode pedir pra mudar de lugar depois, por ora é ali de propósito).
  vagasAlertaCount?: number;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const temMenu = logado;
  const mostrarVoltar = dentroDeTenant && pathname !== logoHref;
  const naLanding = pathname === "/";
  const itensNav = [
    ...navItems,
    ...(responsavelEtica ? [{ href: "/etica", label: "Central de Ética" }] : []),
    ...(responsavelGed ? [{ href: "/ged", label: "GED" }] : []),
  ];

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="w-full px-4 py-3 flex items-center gap-3">
        <Link
          href={logoHref}
          onClick={() => setMenuAberto(false)}
          className="flex items-center gap-2 shrink-0"
        >
          <Logo size={34} />
        </Link>

        {mostrarVoltar && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Voltar"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-brand-700 font-medium shrink-0 -ml-2 px-2 py-1.5 rounded-lg hover:bg-stone-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
            </svg>
            <span className="hidden sm:inline">Voltar</span>
          </button>
        )}

        {dentroDeTenant && (
          <nav className="hidden xl:flex gap-2 text-[13px] min-w-0 overflow-x-auto">
            {itensNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1 text-stone-500 hover:text-brand-700 font-medium transition-colors whitespace-nowrap"
              >
                {item.label}
                {item.href === "/vagas" && vagasAlertaCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {vagasAlertaCount > 99 ? "99+" : vagasAlertaCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        )}

        <div
          className={`ml-auto items-center gap-3 text-sm ${
            logado ? "hidden xl:flex" : "flex"
          }`}
        >
          <HeaderExtras
            mostrarEmpresas={mostrarEmpresas}
            mostrarEmpresasMaster={mostrarEmpresasMaster}
            isMasterSemEmpresa={isMasterSemEmpresa}
            logado={logado}
            naLanding={naLanding}
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

      {dentroDeTenant && (empresaEfetivoNome || masterEmEmpresa) && (
        // Barra própria, sempre em largura total — não divide espaço com
        // logo/voltar/hambúrguer/menu, então nunca fica espremida a ponto
        // de sumir ou estourar a largura da tela. Era isso que acontecia
        // antes: com 10+ itens de menu crescendo (o sistema foi ganhando
        // páginas novas o tempo todo) mais o botão "Voltar ao painel
        // master" (só master vê) espremidos na MESMA linha do logo, o
        // total passava de 1440px em telas médias — a barra de navegação
        // ficava cortada/estourada. Mover o botão de master pra cá
        // resolveu: ele não compete mais por espaço com o menu.
        <div className="border-t border-stone-100 bg-stone-50 px-4 py-1 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {empresaEfetivoNome ? (
            <p
              className="text-xs font-medium text-stone-600 overflow-hidden whitespace-nowrap min-w-0 max-w-full"
              title={empresaEfetivoNome}
            >
              🏢 {truncarNome(empresaEfetivoNome, 40)}
            </p>
          ) : (
            <span />
          )}
          {masterEmEmpresa && (
            <form action={voltarParaMaster} className="shrink-0">
              <button
                type="submit"
                className="rounded-full bg-brand-50 text-brand-700 border border-brand-200 px-3 py-0.5 text-xs font-medium hover:bg-brand-100 transition-colors whitespace-nowrap"
              >
                🏢 Voltar ao painel master
              </button>
            </form>
          )}
        </div>
      )}

      {temMenu && menuAberto && (
        <div className="xl:hidden border-t border-stone-200 bg-white px-4 py-3 flex flex-col gap-1">
          {dentroDeTenant &&
            itensNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAberto(false)}
                className={`flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium ${
                  pathname === item.href
                    ? "bg-brand-50 text-brand-700"
                    : "text-stone-700 active:bg-stone-100"
                }`}
              >
                {item.label}
                {item.href === "/vagas" && vagasAlertaCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                    {vagasAlertaCount > 99 ? "99+" : vagasAlertaCount}
                  </span>
                )}
              </Link>
            ))}
          <div className="border-t border-stone-200 mt-1 pt-2 flex flex-col gap-1 text-sm">
            <HeaderExtras
              mostrarEmpresas={mostrarEmpresas}
              mostrarEmpresasMaster={mostrarEmpresasMaster}
              isMasterSemEmpresa={isMasterSemEmpresa}
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
  mostrarEmpresas,
  mostrarEmpresasMaster,
  isMasterSemEmpresa,
  logado,
  naLanding = false,
  empilhado = false,
  onNavigate,
}: {
  mostrarEmpresas: boolean;
  mostrarEmpresasMaster: boolean;
  isMasterSemEmpresa: boolean;
  logado: boolean;
  naLanding?: boolean;
  empilhado?: boolean;
  onNavigate?: () => void;
}) {
  const linkClasses = empilhado
    ? "rounded-lg px-3 py-3 text-base font-medium text-stone-700 active:bg-stone-100"
    : "text-stone-500 hover:text-brand-700 font-medium transition-colors whitespace-nowrap";

  return (
    <>
      {mostrarEmpresas && (
        <Link href="/empresas" onClick={onNavigate} className={linkClasses}>
          🏢 Trocar empresa
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
      {!logado && naLanding && (
        <>
          <Link
            href="/portal/entrar"
            onClick={onNavigate}
            className={
              empilhado
                ? "rounded-lg px-3 py-3 text-base font-medium text-brand-700 bg-brand-50 active:bg-brand-100"
                : "rounded-full border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-semibold px-3 py-1.5 transition-colors whitespace-nowrap"
            }
          >
            🧑‍🍳 Sou freelancer
          </Link>
          <Link
            href="/login"
            onClick={onNavigate}
            className={
              empilhado
                ? "rounded-lg px-3 py-3 text-base font-medium text-white bg-navy-900 active:bg-navy-800"
                : "rounded-full bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-1.5 transition-colors whitespace-nowrap"
            }
          >
            🏢 Sou empresa
          </Link>
        </>
      )}
      {!logado && !naLanding && (
        <Link href="/login" onClick={onNavigate} className={linkClasses}>
          Entrar
        </Link>
      )}
    </>
  );
}
