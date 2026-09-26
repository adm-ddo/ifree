"use client";

import { usePathname } from "next/navigation";

/** Esconde o cabeçalho/menu e o alerta de pagamentos pendentes nas rotas do
 * totem (/t/[token]) — é um kiosk público, não deve ter nenhum jeito de
 * navegar pra fora do fluxo de CPF/check-in/check-out. Também escondido em
 * /manual, que tem sua própria barra de topo e menu (documento autocontido,
 * pensado pra ser lido isolado), em /conecta e /pitch, apresentações de
 * visão/pitch do produto (documentos full-bleed próprios, sem relação com
 * a navegação do painel), em /portal, o Portal do freelancer (iFREE
 * Conecta, Fase 2) — que tem seu próprio header mínimo
 * (src/app/portal/layout.tsx) e não deve misturar com a navegação do
 * dono/empresa — e em /v2, o novo layout em paralelo (src/app/v2/layout.tsx),
 * que tem sua própria barra lateral/abas fixas. */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (
    pathname?.startsWith("/t/") ||
    pathname?.startsWith("/manual") ||
    pathname?.startsWith("/conecta") ||
    pathname?.startsWith("/pitch") ||
    pathname?.startsWith("/portal") ||
    pathname?.startsWith("/v2") ||
    pathname?.startsWith("/master")
  ) {
    return null;
  }
  return <>{children}</>;
}
