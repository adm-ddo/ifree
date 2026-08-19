"use client";

import { usePathname } from "next/navigation";

/** Esconde o cabeçalho/menu e o alerta de pagamentos pendentes nas rotas do
 * totem (/t/[token]) — é um kiosk público, não deve ter nenhum jeito de
 * navegar pra fora do fluxo de CPF/check-in/check-out. */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/t/")) return null;
  return <>{children}</>;
}
