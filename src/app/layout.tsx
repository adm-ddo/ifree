import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { getSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppHeader from "@/components/AppHeader";
import AlertaPagamentosPendentes from "@/components/AlertaPagamentosPendentes";
import ChromeGate from "@/components/ChromeGate";
import MainWrapper from "@/components/MainWrapper";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iFREE",
  description: "Sua hora, seu jeito, seu dinheiro na hora. Controle de freelancers/extras, do check-in ao PIX.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessao = await getSessao();
  const dentroDeTenant = !!sessao?.empresaEfetivoId;
  const masterEmEmpresa = !!(sessao?.isMaster && sessao.empresaAtivaId);
  // Mostra o link de trocar/cadastrar empresa pra qualquer dono logado numa
  // empresa — não só quem já tem 2+, senão quem tem só 1 nunca descobre onde
  // cadastrar uma segunda. Master também pode ser dono de empresas próprias
  // (fora do painel de supervisão), então mostra o link pra ele também
  // quando não está navegando dentro de nenhuma empresa agora.
  const mostrarLinkEmpresas = !!sessao && !sessao.isMaster && dentroDeTenant;
  const mostrarEmpresasMaster = !!(sessao?.isMaster && !sessao.empresaAtivaId);

  const pagamentosPendentes = dentroDeTenant
    ? await prisma.pagamento.aggregate({
        where: {
          status: { in: ["PENDENTE", "FALHOU"] },
          turno: { empresaId: sessao!.empresaEfetivoId! },
        },
        _count: true,
        _sum: { valor: true },
      })
    : null;

  return (
    <html lang="pt-BR" className={`${urbanist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ChromeGate>
          <AppHeader
            logoHref={
              sessao
                ? dentroDeTenant
                  ? "/dashboard"
                  : sessao.isMaster
                    ? "/master"
                    : "/empresas"
                : "/"
            }
            logado={!!sessao}
            dentroDeTenant={dentroDeTenant}
            masterEmEmpresa={masterEmEmpresa}
            mostrarEmpresas={mostrarLinkEmpresas}
            mostrarEmpresasMaster={mostrarEmpresasMaster}
            isMasterSemEmpresa={!!(sessao?.isMaster && !sessao.empresaAtivaId)}
            empresaEfetivoNome={sessao?.empresaEfetivoNome ?? null}
          />
          {pagamentosPendentes && (
            <AlertaPagamentosPendentes
              quantidade={pagamentosPendentes._count}
              total={Number(pagamentosPendentes._sum.valor ?? 0)}
            />
          )}
        </ChromeGate>
        <MainWrapper>{children}</MainWrapper>
      </body>
    </html>
  );
}
