import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { getSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppHeader from "@/components/AppHeader";
import AlertaPagamentosPendentes from "@/components/AlertaPagamentosPendentes";
import AlertaFeriasVencendo from "@/components/AlertaFeriasVencendo";
import AlertaExperienciaVencendo from "@/components/AlertaExperienciaVencendo";
import AlertaDenunciasNovas from "@/components/AlertaDenunciasNovas";
import AlertaCandidaturasConecta from "@/components/AlertaCandidaturasConecta";
import ChromeGate from "@/components/ChromeGate";
import MainWrapper from "@/components/MainWrapper";
import { calcularStatusFerias } from "@/lib/ferias";
import { calcularStatusExperiencia } from "@/lib/experiencia";
import { usuarioEhResponsavelEtica } from "@/lib/etica";
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
  // Empresa bloqueada por assinatura conta como "fora de tenant" pro
  // cabeçalho/avisos — o painel inteiro redireciona pra /assinatura (ver
  // requireTenant em src/lib/auth.ts), então mostrar a navegação inteira
  // aqui só confundiria (parece que dá pra clicar em Turnos/Relatórios,
  // mas qualquer um deles volta pra cá). Master nunca é bloqueado.
  const bloqueadoPorAssinatura =
    !!sessao &&
    !sessao.isMaster &&
    (sessao.empresaEfetivoStatusAssinatura === "ATRASADA" ||
      sessao.empresaEfetivoStatusAssinatura === "CANCELADA");
  const dentroDeTenant = !!sessao?.empresaEfetivoId && !bloqueadoPorAssinatura;
  const masterEmEmpresa = !!(sessao?.isMaster && sessao.empresaAtivaId);
  // Mostra o link de trocar/cadastrar empresa pra qualquer dono logado numa
  // empresa — não só quem já tem 2+, senão quem tem só 1 nunca descobre onde
  // cadastrar uma segunda. Master também pode ser dono de empresas próprias
  // (fora do painel de supervisão), então mostra o link pra ele também
  // quando não está navegando dentro de nenhuma empresa agora.
  const mostrarLinkEmpresas = !!sessao && !sessao.isMaster && dentroDeTenant;
  const mostrarEmpresasMaster = !!(sessao?.isMaster && !sessao.empresaAtivaId);

  // Esse aviso é só um "a mais" (lembrete de pagamento pendente) — não pode
  // nunca derrubar a página inteira. Sem o try/catch, uma falha pontual
  // nessa consulta (rede, banco sob pressão) travava o layout raiz, que
  // envolve TODA rota do site, inclusive a landing pública.
  let pagamentosPendentes: { _count: number; _sum: { valor: unknown } } | null = null;
  if (dentroDeTenant) {
    try {
      pagamentosPendentes = await prisma.pagamento.aggregate({
        where: {
          status: { in: ["PENDENTE", "FALHOU"] },
          turno: { empresaId: sessao!.empresaEfetivoId! },
        },
        _count: true,
        _sum: { valor: true },
      });
    } catch (err) {
      console.error("Falha ao buscar pagamentos pendentes pro aviso do topo:", err);
    }
  }

  // Mesmo espírito do aviso de pagamentos pendentes acima — nunca pode
  // derrubar o layout raiz, então também protegido por try/catch.
  let feriasAlerta: { vencidas: number; vencendoEmBreve: number } | null = null;
  if (dentroDeTenant) {
    try {
      const vinculosClt = await prisma.vinculoPessoaEmpresa.findMany({
        where: {
          empresaId: sessao!.empresaEfetivoId!,
          tipoVinculo: "CLT",
          ativo: true,
          dataAdmissao: { not: null },
        },
        select: { dataAdmissao: true, ultimasFeriasGozadasEm: true },
      });
      const hoje = new Date();
      let vencidas = 0;
      let vencendoEmBreve = 0;
      for (const v of vinculosClt) {
        const status = calcularStatusFerias(v.dataAdmissao!, v.ultimasFeriasGozadasEm, hoje);
        if (status.fase === "VENCIDA") vencidas++;
        else if (status.fase === "CONCESSIVO" && status.diasRestantes <= 60) vencendoEmBreve++;
      }
      if (vencidas > 0 || vencendoEmBreve > 0) {
        feriasAlerta = { vencidas, vencendoEmBreve };
      }
    } catch (err) {
      console.error("Falha ao buscar férias vencendo pro aviso do topo:", err);
    }
  }

  // Mesmo espírito do try/catch dos avisos acima — nunca pode derrubar o
  // layout raiz por causa de um detalhe de navegação.
  let responsavelEtica = false;
  if (dentroDeTenant) {
    try {
      responsavelEtica = await usuarioEhResponsavelEtica(
        sessao!.usuarioId,
        sessao!.empresaEfetivoId!,
        sessao!.isMaster
      );
    } catch (err) {
      console.error("Falha ao checar acesso à Central de Ética:", err);
    }
  }

  // Mesmo espírito dos avisos acima — só consulta quando a pessoa
  // realmente tem acesso à Central de Ética, senão até a EXISTÊNCIA de
  // uma denúncia vazaria pra quem não devia saber.
  let denunciasNovas = 0;
  if (dentroDeTenant && responsavelEtica) {
    try {
      denunciasNovas = await prisma.denuncia.count({
        where: { empresaId: sessao!.empresaEfetivoId!, status: "RECEBIDO" },
      });
    } catch (err) {
      console.error("Falha ao checar denúncias novas pro aviso do topo:", err);
    }
  }

  // Mesmo espírito dos avisos acima — conta candidaturas do iFREE Conecta
  // ainda sem resposta (ENVIADA) nas vagas desta empresa, pra alertar tanto
  // no banner do dashboard quanto no numerozinho do nav "Vagas" (ver
  // vagasAlertaCount abaixo, reaproveita a mesma consulta).
  let candidaturasPendentes = 0;
  let candidaturasPendentesComMatch = 0;
  let mensagensConectaNaoLidas = 0;
  if (dentroDeTenant) {
    try {
      const [pendentes, conversas] = await Promise.all([
        prisma.candidatura.findMany({
          where: { status: "ENVIADA", vaga: { empresaId: sessao!.empresaEfetivoId! } },
          select: { match: true },
        }),
        prisma.conversa.findMany({
          where: { empresaId: sessao!.empresaEfetivoId! },
          select: {
            ultimaLeituraEmpresaEm: true,
            mensagens: {
              where: { autor: "PESSOA" },
              orderBy: { criadoEm: "desc" },
              take: 1,
              select: { criadoEm: true },
            },
          },
        }),
      ]);
      candidaturasPendentes = pendentes.length;
      candidaturasPendentesComMatch = pendentes.filter((c) => c.match).length;
      mensagensConectaNaoLidas = conversas.filter((c) => {
        const ultima = c.mensagens[0];
        return ultima && (!c.ultimaLeituraEmpresaEm || ultima.criadoEm > c.ultimaLeituraEmpresaEm);
      }).length;
    } catch (err) {
      console.error("Falha ao buscar candidaturas/mensagens do Conecta pro aviso do topo:", err);
    }
  }
  const vagasAlertaCount = candidaturasPendentes + mensagensConectaNaoLidas;

  // Mesmo espírito dos dois avisos acima.
  let experienciaAlerta: { vencidos: number; vencendoEmBreve: number } | null = null;
  if (dentroDeTenant) {
    try {
      const vinculosExperiencia = await prisma.vinculoPessoaEmpresa.findMany({
        where: {
          empresaId: sessao!.empresaEfetivoId!,
          tipoVinculo: "CLT",
          ativo: true,
          dataAdmissao: { not: null },
          experienciaDias1: { not: null },
          experienciaEfetivadoEm: null,
        },
        select: {
          dataAdmissao: true,
          experienciaDias1: true,
          experienciaDias2: true,
          experienciaContinuouEm: true,
          experienciaEfetivadoEm: true,
        },
      });
      const hoje = new Date();
      let vencidos = 0;
      let vencendoEmBreve = 0;
      for (const v of vinculosExperiencia) {
        const status = calcularStatusExperiencia(
          v.dataAdmissao!,
          v.experienciaDias1!,
          v.experienciaDias2,
          v.experienciaContinuouEm,
          v.experienciaEfetivadoEm,
          hoje
        );
        if (status.fase === "VENCIDO") vencidos++;
        else if (status.fase === "ATENCAO") vencendoEmBreve++;
      }
      if (vencidos > 0 || vencendoEmBreve > 0) {
        experienciaAlerta = { vencidos, vencendoEmBreve };
      }
    } catch (err) {
      console.error("Falha ao buscar contratos de experiência vencendo pro aviso do topo:", err);
    }
  }

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
            responsavelEtica={responsavelEtica}
            vagasAlertaCount={vagasAlertaCount}
          />
          <AlertaDenunciasNovas quantidade={denunciasNovas} />
          <AlertaCandidaturasConecta
            pendentes={candidaturasPendentes}
            matches={candidaturasPendentesComMatch}
          />
          {pagamentosPendentes && (
            <AlertaPagamentosPendentes
              quantidade={pagamentosPendentes._count}
              total={Number(pagamentosPendentes._sum.valor ?? 0)}
            />
          )}
          {feriasAlerta && (
            <AlertaFeriasVencendo
              vencidas={feriasAlerta.vencidas}
              vencendoEmBreve={feriasAlerta.vencendoEmBreve}
            />
          )}
          {experienciaAlerta && (
            <AlertaExperienciaVencendo
              vencidos={experienciaAlerta.vencidos}
              vencendoEmBreve={experienciaAlerta.vencendoEmBreve}
            />
          )}
        </ChromeGate>
        <MainWrapper>{children}</MainWrapper>
      </body>
    </html>
  );
}
