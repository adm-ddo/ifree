"use client";

import { usePathname } from "next/navigation";

/** A landing page (rota "/"), o manual (/manual), as apresentações de
 * visão/pitch (/conecta, /pitch), a página de planos (/planos), o Portal
 * do freelancer (/portal), a v2 (/v2) e o painel master (/master) são
 * páginas full-bleed — cada uma define sua própria largura máxima
 * internamente (ver src/app/page.tsx, src/app/manual/, src/app/conecta/,
 * src/app/pitch/, src/app/planos/, src/app/portal/layout.tsx,
 * src/app/v2/layout.tsx e src/app/master/layout.tsx, que têm sua própria
 * barra lateral/abas fixas). Todo o resto do site (painel admin) é
 * conteúdo tipo dashboard/formulário, onde uma coluna mais estreita lê
 * melhor — por isso só essas escapam do max-w-4xl aplicado aqui. */
export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ehLanding = pathname === "/";
  const ehManual = pathname?.startsWith("/manual");
  const ehConecta = pathname?.startsWith("/conecta");
  const ehPitch = pathname?.startsWith("/pitch");
  const ehPlanos = pathname?.startsWith("/planos");
  const ehPortal = pathname?.startsWith("/portal");
  const ehV2 = pathname?.startsWith("/v2");
  const ehMaster = pathname?.startsWith("/master");

  if (ehLanding || ehManual || ehConecta || ehPitch || ehPlanos || ehPortal || ehV2 || ehMaster) {
    return <main className="flex-1 w-full flex flex-col">{children}</main>;
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 flex flex-col">
      {children}
    </main>
  );
}
