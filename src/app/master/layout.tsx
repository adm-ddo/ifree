import { Sora } from "next/font/google";
import { requireMaster } from "@/lib/auth";
import NavShell, { type ItemNavV2 } from "@/components/v2/NavShell";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

const ITENS_MASTER: ItemNavV2[] = [
  { href: "/master", label: "Empresas", icone: "dashboard" },
  { href: "/master/assinaturas", label: "Assinaturas", icone: "financeiro" },
  { href: "/master/freelancers", label: "Freelancers", icone: "freelancers" },
];

/** Casca do painel master no mesmo visual da v2 (NavShell, fonte Sora,
 * cor de marca em bloco) — antes disso /master caía no layout raiz v1
 * (AppHeader antigo + MainWrapper com coluna estreita, ver exclusão em
 * ChromeGate.tsx/MainWrapper.tsx). Bem mais simples que src/app/v2/layout.tsx:
 * master não tem "empresa efetiva" nem módulo por vínculo — sempre vê os
 * 3 itens completos, sem avisos de assinatura/candidatura (isso é coisa
 * de dono de empresa, não do painel master). `mostrarEmpresas: false`/
 * `masterEmEmpresa: false` porque aqui master está no PRÓPRIO painel, não
 * "dentro" de uma empresa de cliente (isso só acontece depois de
 * "Acessar", que leva pra /v2/dashboard normal). */
export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  await requireMaster();

  return (
    <div className={`${sora.variable} font-v2 min-h-full`}>
      <NavShell itens={ITENS_MASTER} nomeEmpresa="iFREE Master" mostrarEmpresas={false} masterEmEmpresa={false}>
        {children}
      </NavShell>
    </div>
  );
}
