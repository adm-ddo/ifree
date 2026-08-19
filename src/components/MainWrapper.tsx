"use client";

import { usePathname } from "next/navigation";

/** A landing page (rota "/") é uma página de marketing full-bleed — cada
 * seção define sua própria largura máxima internamente (ver src/app/
 * page.tsx). Todo o resto do site (painel admin) é conteúdo tipo
 * dashboard/formulário, onde uma coluna mais estreita lê melhor — por
 * isso só a landing escapa do max-w-4xl aplicado aqui. */
export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ehLanding = pathname === "/";

  if (ehLanding) {
    return <main className="flex-1 w-full flex flex-col">{children}</main>;
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 flex flex-col">
      {children}
    </main>
  );
}
