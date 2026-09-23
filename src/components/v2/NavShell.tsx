"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeV2, type NomeIconeV2 } from "./Icons";
import { logout } from "@/lib/auth-actions";
import { voltarParaMaster } from "@/app/master/actions";

export type ItemNavV2 = { href: string; label: string; icone: NomeIconeV2 };

/// Itens que aparecem nas abas fixas do celular — os outros só aparecem
/// dentro de "Mais" (celular) ou na barra lateral inteira (computador).
const HREFS_ABA_PRINCIPAL = ["/v2/dashboard", "/v2/turnos", "/v2/pagamentos", "/v2/funcionarios"];

function estaAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavShell({
  itens,
  nomeEmpresa,
  mostrarEmpresas,
  masterEmEmpresa,
  alertas,
  children,
}: {
  itens: ItemNavV2[];
  nomeEmpresa: string;
  /// Mostra "Trocar empresa" no rodapé da nav — mesma regra do v1
  /// (AppHeader.tsx: mostrarLinkEmpresas), true pra quem não é master.
  mostrarEmpresas: boolean;
  /// Master acessando uma empresa de cliente (via /master → "Acessar") —
  /// mostra "Voltar ao painel master", mesma regra/ação do v1
  /// (AppHeader.tsx: masterEmEmpresa + voltarParaMaster). Sem isso, um
  /// master só conseguia voltar pro /master deslogando e logando de novo,
  /// já que a v2 nunca teve esse botão (só o v1 tinha).
  masterEmEmpresa: boolean;
  /// Avisos do topo (assinatura vencendo, pagamentos pendentes, férias,
  /// experiência CLT, denúncias novas, candidaturas do Conecta) — ver
  /// AlertasV2.tsx. Opcional só pra não quebrar quem ainda não passa
  /// (nenhuma tela hoje), sempre renderizado antes do conteúdo.
  alertas?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [maisAberto, setMaisAberto] = useState(false);

  const iniciais = nomeEmpresa
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const itensPrincipais = itens.filter((i) => HREFS_ABA_PRINCIPAL.includes(i.href));
  const itensResto = itens.filter((i) => !HREFS_ABA_PRINCIPAL.includes(i.href));

  return (
    <div className="min-h-full flex flex-col lg:flex-row bg-stone-50">
      {/* Barra lateral — computador */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 bg-brand-500 px-3 py-4 gap-1">
        <div className="text-white font-extrabold text-lg px-2 pb-4">iFREE</div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto">
          {itens.map((item) => {
            const ativo = estaAtivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                  ativo ? "bg-white text-brand-700" : "text-white/85 hover:bg-white/10"
                }`}
              >
                <IconeV2 nome={item.icone} className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-1 flex flex-col gap-0.5">
          {masterEmEmpresa && (
            <form action={voltarParaMaster}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                🏢 Voltar ao painel master
              </button>
            </form>
          )}
          {mostrarEmpresas && (
            <Link
              href="/v2/empresas"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-white/85 hover:bg-white/10 transition-colors"
            >
              🏢 Trocar empresa
            </Link>
          )}
          <Link
            href="/v2/meus-dados"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-white/85 hover:bg-white/10 transition-colors"
          >
            Meus dados
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-white/85 hover:bg-white/10 transition-colors"
            >
              <IconeV2 nome="sair" className="w-4 h-4 shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Topo — celular */}
      <div className="lg:hidden flex items-center justify-between bg-brand-500 px-4 py-3 rounded-b-2xl">
        <span className="text-white font-extrabold text-[15px]">iFREE</span>
        <span className="w-7 h-7 rounded-full bg-white text-brand-700 text-[11px] font-bold flex items-center justify-center">
          {iniciais || "i"}
        </span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {alertas && <div className="flex flex-col">{alertas}</div>}
        <div className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</div>
      </div>

      {/* Abas fixas — celular */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 flex justify-around py-2 z-40">
        {itensPrincipais.map((item) => {
          const ativo = estaAtivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
                ativo ? "text-brand-700" : "text-stone-400"
              }`}
            >
              <IconeV2 nome={item.icone} className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMaisAberto(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-stone-400"
        >
          <IconeV2 nome="mais" className="w-[18px] h-[18px]" />
          Mais
        </button>
      </nav>

      {/* Painel "Mais" — celular */}
      {maisAberto && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setMaisAberto(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full max-h-[75vh] overflow-y-auto bg-white rounded-t-2xl p-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-navy-900">Mais</h2>
              <button
                type="button"
                onClick={() => setMaisAberto(false)}
                className="text-stone-400 text-sm font-semibold"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {itensResto.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMaisAberto(false)}
                  className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-navy-900 rounded-xl border border-stone-200 p-3"
                >
                  <IconeV2 nome={item.icone} className="w-5 h-5 text-brand-600" />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex flex-col">
              {masterEmEmpresa && (
                <form action={voltarParaMaster}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 text-sm font-semibold text-brand-700 py-2"
                  >
                    🏢 Voltar ao painel master
                  </button>
                </form>
              )}
              {mostrarEmpresas && (
                <Link
                  href="/v2/empresas"
                  onClick={() => setMaisAberto(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-stone-600 py-2"
                >
                  🏢 Trocar empresa
                </Link>
              )}
              <Link
                href="/v2/meus-dados"
                onClick={() => setMaisAberto(false)}
                className="flex items-center gap-2 text-sm font-semibold text-stone-600 py-2"
              >
                Meus dados
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 text-sm font-semibold text-stone-600 py-2"
                >
                  <IconeV2 nome="sair" className="w-4 h-4 shrink-0" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
