"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeV2, type NomeIconeV2 } from "./Icons";
import { logout } from "@/lib/auth-actions";
import { voltarParaMaster } from "@/app/master/actions";

/// bloqueado: módulo que existe no catálogo mas fica fora do plano Conecta
/// (ver src/app/v2/layout.tsx) — continua visível na nav pra funcionar
/// como vitrine do plano Completo, só que sem navegar: clicar abre o
/// modal de upsell (ver ModalUpsell abaixo) em vez de ir pra página (que
/// redirecionaria mesmo assim, requireModulo barra no servidor).
export type ItemNavV2 = { href: string; label: string; icone: NomeIconeV2; bloqueado?: boolean };

/// Itens que aparecem nas abas fixas do celular — os outros só aparecem
/// dentro de "Mais" (celular) ou na barra lateral inteira (computador).
const HREFS_ABA_PRINCIPAL = ["/v2/dashboard", "/v2/turnos", "/v2/pagamentos", "/v2/funcionarios"];

/// Entre todos os hrefs da nav que "batem" com a rota atual (exato ou
/// prefixo, ex.: /v2/vagas continua ativo em /v2/vagas/42), escolhe o mais
/// específico (string mais longa) — sem isso, um item "raiz" cujo href é
/// prefixo literal de outro item-irmão (caso novo do painel master:
/// "/master" é prefixo de "/master/assinaturas") ficava marcado ativo
/// junto com o item certo ao mesmo tempo.
function hrefMaisEspecificoAtivo(pathname: string, hrefs: string[]): string | null {
  const candidatos = hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  if (candidatos.length === 0) return null;
  return candidatos.reduce((a, b) => (b.length > a.length ? b : a));
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
  const [moduloBloqueado, setModuloBloqueado] = useState<ItemNavV2 | null>(null);
  const hrefAtivo = hrefMaisEspecificoAtivo(pathname, itens.map((i) => i.href));

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
      {/* Barra lateral — computador. Fixa na tela (sticky + h-screen +
       * overflow-y-auto próprio) em vez de esticar junto com o conteúdo à
       * direita — sem isso, numa tela de conteúdo longo (relatório grande,
       * lista extensa) o rodapé (Meus dados/Sair) ficava lá embaixo do
       * tanto que o conteúdo tinha de altura, obrigando rolar a página
       * inteira só pra sair. Agora fica sempre visível, rolando por conta
       * própria só se a barra em si não couber na tela (muitos itens de
       * menu numa tela baixa). */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto scroll-sidebar-v2 bg-brand-500 px-3 py-4 gap-1">
        <div className="text-white font-extrabold text-lg px-2 pb-4">iFREE</div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto">
          {itens.map((item) => {
            if (item.bloqueado) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setModuloBloqueado(item)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-white/45 hover:bg-white/10 transition-colors"
                >
                  <IconeV2 nome={item.icone} className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <IconeV2 nome="cadeado" className="w-3.5 h-3.5 shrink-0" />
                </button>
              );
            }
            const ativo = item.href === hrefAtivo;
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
          if (item.bloqueado) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setModuloBloqueado(item)}
                className="flex flex-col items-center gap-1 text-[10px] font-bold text-stone-300 relative"
              >
                <IconeV2 nome={item.icone} className="w-[18px] h-[18px]" />
                <IconeV2 nome="cadeado" className="w-2.5 h-2.5 absolute -top-0.5 right-1.5 text-stone-400" />
                {item.label}
              </button>
            );
          }
          const ativo = item.href === hrefAtivo;
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
              {itensResto.map((item) =>
                item.bloqueado ? (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      setMaisAberto(false);
                      setModuloBloqueado(item);
                    }}
                    className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-stone-400 rounded-xl border border-stone-200 p-3 relative"
                  >
                    <IconeV2 nome={item.icone} className="w-5 h-5 text-stone-300" />
                    <IconeV2 nome="cadeado" className="w-3 h-3 absolute top-2 right-2 text-stone-400" />
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMaisAberto(false)}
                    className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-navy-900 rounded-xl border border-stone-200 p-3"
                  >
                    <IconeV2 nome={item.icone} className="w-5 h-5 text-brand-600" />
                    {item.label}
                  </Link>
                )
              )}
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

      {/* Modal de upsell — abre ao clicar num item travado do plano
       * Conecta, nos 3 pontos acima. Pitch curto, sem foto (só o mesmo
       * conjunto de ícones da nav), CTA pra /v2/upgrade. */}
      {moduloBloqueado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setModuloBloqueado(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col items-center text-center gap-3">
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-50 text-navy-700">
              <IconeV2 nome={moduloBloqueado.icone} className="w-7 h-7" />
            </span>
            <h2 className="font-bold text-navy-900 text-lg">
              {moduloBloqueado.label} é do plano Completo
            </h2>
            <p className="text-stone-600 text-sm">
              No plano Conecta você anuncia vagas e conversa com freelancers. Pra desbloquear{" "}
              {moduloBloqueado.label.toLowerCase()} — e todo o resto (ponto CLT, PGR, Central de
              Ética, documentos, totem) — é só migrar pro Gestão Completa.
            </p>
            <Link
              href="/v2/upgrade"
              onClick={() => setModuloBloqueado(null)}
              className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm py-2.5 mt-1"
            >
              Ver o que muda →
            </Link>
            <button
              type="button"
              onClick={() => setModuloBloqueado(null)}
              className="text-stone-500 text-xs font-semibold"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
