import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import { getSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppHeader from "@/components/AppHeader";
import AlertaPagamentosPendentes from "@/components/AlertaPagamentosPendentes";
import AlertaFeriasVencendo from "@/components/AlertaFeriasVencendo";
import AlertaExperienciaVencendo from "@/components/AlertaExperienciaVencendo";
import AlertaDenunciasNovas from "@/components/AlertaDenunciasNovas";
import AlertaCandidaturasConecta from "@/components/AlertaCandidaturasConecta";
import AlertaAssinaturaVencendo from "@/components/AlertaAssinaturaVencendo";
import ChromeGate from "@/components/ChromeGate";
import MainWrapper from "@/components/MainWrapper";
import SplashScreen from "@/components/SplashScreen";
import { calcularStatusFerias } from "@/lib/ferias";
import { calcularStatusExperiencia } from "@/lib/experiencia";
import { usuarioEhResponsavelEtica } from "@/lib/etica";
import { usuarioEhResponsavelGed } from "@/lib/ged";
import { diasParaVencer, GRACA_DIAS } from "@/lib/assinatura";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iFREE",
  description: "Sua hora, seu jeito, seu dinheiro na hora. Controle de freelancers/extras, do check-in ao PIX.",
};

export const viewport: Viewport = {
  themeColor: "#00C896",
};

// Os avisos do topo abaixo (pagamentos pendentes, férias, GED/Ética,
// candidaturas do Conecta, experiência, assinatura) rodavam em sequência —
// 7 round-trips ao banco, um atrás do outro, em TODA navegação do painel
// (o layout raiz envolve toda rota autenticada). Nenhum depende do
// resultado de outro (só de empresaEfetivoId/usuarioId, já conhecidos),
// exceto denunciasNovas, que só faz sentido depois de saber
// responsavelEtica — por isso vira um Promise.all de 7 + 1 await
// dependente, em vez de 8 awaits em série. Cada função mantém seu próprio
// try/catch (nunca pode derrubar o layout inteiro por causa de um aviso).

async function buscarPagamentosPendentes(
  empresaId: number
): Promise<{ _count: number; _sum: { valor: unknown } } | null> {
  try {
    return await prisma.pagamento.aggregate({
      where: { status: { in: ["PENDENTE", "FALHOU"] }, turno: { empresaId } },
      _count: true,
      _sum: { valor: true },
    });
  } catch (err) {
    console.error("Falha ao buscar pagamentos pendentes pro aviso do topo:", err);
    return null;
  }
}

async function buscarFeriasAlerta(
  empresaId: number
): Promise<{ vencidas: number; vencendoEmBreve: number } | null> {
  try {
    const vinculosClt = await prisma.vinculoPessoaEmpresa.findMany({
      where: { empresaId, tipoVinculo: "CLT", ativo: true, dataAdmissao: { not: null } },
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
    return vencidas > 0 || vencendoEmBreve > 0 ? { vencidas, vencendoEmBreve } : null;
  } catch (err) {
    console.error("Falha ao buscar férias vencendo pro aviso do topo:", err);
    return null;
  }
}

async function checarResponsavelEticaSeguro(
  usuarioId: number,
  empresaId: number,
  isMaster: boolean
): Promise<boolean> {
  try {
    return await usuarioEhResponsavelEtica(usuarioId, empresaId, isMaster);
  } catch (err) {
    console.error("Falha ao checar acesso à Central de Ética:", err);
    return false;
  }
}

async function checarResponsavelGedSeguro(
  usuarioId: number,
  empresaId: number,
  isMaster: boolean
): Promise<boolean> {
  try {
    return await usuarioEhResponsavelGed(usuarioId, empresaId, isMaster);
  } catch (err) {
    console.error("Falha ao checar acesso ao GED:", err);
    return false;
  }
}

async function buscarDenunciasNovas(empresaId: number): Promise<number> {
  try {
    return await prisma.denuncia.count({ where: { empresaId, status: "RECEBIDO" } });
  } catch (err) {
    console.error("Falha ao checar denúncias novas pro aviso do topo:", err);
    return 0;
  }
}

type CandidaturasEConversas = {
  candidaturasPendentes: number;
  candidaturasPendentesComMatch: number;
  mensagensConectaNaoLidas: number;
};

async function buscarCandidaturasEConversas(empresaId: number): Promise<CandidaturasEConversas> {
  try {
    const [pendentes, conversas] = await Promise.all([
      prisma.candidatura.findMany({
        where: { status: "ENVIADA", vaga: { empresaId } },
        select: { match: true },
      }),
      prisma.conversa.findMany({
        where: { empresaId },
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
    return {
      candidaturasPendentes: pendentes.length,
      candidaturasPendentesComMatch: pendentes.filter((c) => c.match).length,
      mensagensConectaNaoLidas: conversas.filter((c) => {
        const ultima = c.mensagens[0];
        return ultima && (!c.ultimaLeituraEmpresaEm || ultima.criadoEm > c.ultimaLeituraEmpresaEm);
      }).length,
    };
  } catch (err) {
    console.error("Falha ao buscar candidaturas/mensagens do Conecta pro aviso do topo:", err);
    return { candidaturasPendentes: 0, candidaturasPendentesComMatch: 0, mensagensConectaNaoLidas: 0 };
  }
}

async function buscarExperienciaAlerta(
  empresaId: number
): Promise<{ vencidos: number; vencendoEmBreve: number } | null> {
  try {
    const vinculosExperiencia = await prisma.vinculoPessoaEmpresa.findMany({
      where: {
        empresaId,
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
    return vencidos > 0 || vencendoEmBreve > 0 ? { vencidos, vencendoEmBreve } : null;
  } catch (err) {
    console.error("Falha ao buscar contratos de experiência vencendo pro aviso do topo:", err);
    return null;
  }
}

async function buscarAssinaturaAlerta(
  empresaId: number
): Promise<{ diasRestantes: number; emTrial: boolean; horasParaBloqueio: number | null } | null> {
  try {
    const empresaAssinatura = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { assinaturaVenceEm: true, statusAssinatura: true, avisoVencimentoDias: true },
    });
    if (
      empresaAssinatura?.assinaturaVenceEm &&
      (empresaAssinatura.statusAssinatura === "TRIAL" || empresaAssinatura.statusAssinatura === "ATIVA")
    ) {
      const dias = diasParaVencer(empresaAssinatura.assinaturaVenceEm);
      if (dias <= empresaAssinatura.avisoVencimentoDias) {
        // Mesmo raciocínio de buscarAssinaturaAlerta em src/lib/alertas.ts
        // (v2): horas até o bloqueio só existe depois de já vencido, e é
        // aproximado porque o cron que bloqueia de verdade só roda 1x/dia.
        let horasParaBloqueio: number | null = null;
        if (dias <= 0) {
          const bloqueioEm = new Date(empresaAssinatura.assinaturaVenceEm);
          bloqueioEm.setDate(bloqueioEm.getDate() + GRACA_DIAS);
          horasParaBloqueio = Math.max(0, Math.ceil((bloqueioEm.getTime() - Date.now()) / (60 * 60 * 1000)));
        }
        return { diasRestantes: dias, emTrial: empresaAssinatura.statusAssinatura === "TRIAL", horasParaBloqueio };
      }
    }
    return null;
  } catch (err) {
    console.error("Falha ao checar vencimento da assinatura pro aviso do topo:", err);
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessao = await getSessao();

  // sessao.empresaEfetivoStatusAssinatura é sempre null pra master (ver
  // getSessao em src/lib/auth.ts) — mas desde 2026-09-08 as próprias
  // empresas do master também pagam mensalidade e ficam sujeitas ao mesmo
  // bloqueio de qualquer cliente (ver requireTenant), então busca o status
  // de verdade direto no banco só nesse caso.
  let statusAssinaturaEfetivo = sessao?.empresaEfetivoStatusAssinatura ?? null;
  let liberacaoConfiancaAteEm = sessao?.empresaEfetivoLiberacaoConfiancaAteEm ?? null;
  if (sessao?.isMaster && sessao.empresaEfetivoId) {
    try {
      const empresaMaster = await prisma.empresa.findUnique({
        where: { id: sessao.empresaEfetivoId },
        select: { statusAssinatura: true, liberacaoConfiancaAteEm: true },
      });
      statusAssinaturaEfetivo = empresaMaster?.statusAssinatura ?? null;
      liberacaoConfiancaAteEm = empresaMaster?.liberacaoConfiancaAteEm ?? null;
    } catch (err) {
      console.error("Falha ao checar status de assinatura do master pro layout raiz:", err);
    }
  }
  // Mesma lógica de requireTenant: liberação de confiança destrava por
  // cima do status normal enquanto a janela ainda não passou, e o master
  // tem seu próprio bypass (botão "Entrar mesmo assim" em /assinatura).
  const liberadoPorConfianca = !!liberacaoConfiancaAteEm && liberacaoConfiancaAteEm > new Date();
  const liberadoPorMaster =
    !!sessao?.isMaster && sessao.masterBypassEmpresaId === sessao.empresaEfetivoId;

  // Empresa bloqueada por assinatura conta como "fora de tenant" pro
  // cabeçalho/avisos — o painel inteiro redireciona pra /assinatura (ver
  // requireTenant em src/lib/auth.ts), então mostrar a navegação inteira
  // aqui só confundiria (parece que dá pra clicar em Turnos/Relatórios,
  // mas qualquer um deles volta pra cá).
  const bloqueadoPorAssinatura =
    !!sessao &&
    !liberadoPorConfianca &&
    !liberadoPorMaster &&
    (statusAssinaturaEfetivo === "ATRASADA" || statusAssinaturaEfetivo === "CANCELADA");
  const dentroDeTenant = !!sessao?.empresaEfetivoId && !bloqueadoPorAssinatura;
  const masterEmEmpresa = !!(sessao?.isMaster && sessao.empresaAtivaId);
  // Mostra o link de trocar/cadastrar empresa pra qualquer dono logado numa
  // empresa — não só quem já tem 2+, senão quem tem só 1 nunca descobre onde
  // cadastrar uma segunda. Master também pode ser dono de empresas próprias
  // (fora do painel de supervisão), então mostra o link pra ele também
  // quando não está navegando dentro de nenhuma empresa agora.
  const mostrarLinkEmpresas = !!sessao && !sessao.isMaster && dentroDeTenant;
  const mostrarEmpresasMaster = !!(sessao?.isMaster && !sessao.empresaAtivaId);

  // Os 7 avisos abaixo não dependem uns dos outros (só de empresaEfetivoId/
  // usuarioId, já resolvidos acima) — rodam em paralelo num Promise.all só,
  // em vez de 7 round-trips em série. denunciasNovas é a exceção: só faz
  // sentido buscar depois de saber responsavelEtica (não vaza nem a
  // existência de denúncia pra quem não tem acesso), por isso fica de fora
  // do Promise.all e vira 1 await dependente logo depois.
  const [
    pagamentosPendentes,
    feriasAlerta,
    responsavelEtica,
    responsavelGed,
    { candidaturasPendentes, candidaturasPendentesComMatch, mensagensConectaNaoLidas },
    experienciaAlerta,
    assinaturaAlerta,
  ] = dentroDeTenant
    ? await Promise.all([
        buscarPagamentosPendentes(sessao!.empresaEfetivoId!),
        buscarFeriasAlerta(sessao!.empresaEfetivoId!),
        checarResponsavelEticaSeguro(sessao!.usuarioId, sessao!.empresaEfetivoId!, sessao!.isMaster),
        checarResponsavelGedSeguro(sessao!.usuarioId, sessao!.empresaEfetivoId!, sessao!.isMaster),
        buscarCandidaturasEConversas(sessao!.empresaEfetivoId!),
        buscarExperienciaAlerta(sessao!.empresaEfetivoId!),
        buscarAssinaturaAlerta(sessao!.empresaEfetivoId!),
      ])
    : ([
        null,
        null,
        false,
        false,
        { candidaturasPendentes: 0, candidaturasPendentesComMatch: 0, mensagensConectaNaoLidas: 0 },
        null,
        null,
      ] as const);
  const vagasAlertaCount = candidaturasPendentes + mensagensConectaNaoLidas;

  // Mesmo espírito dos avisos acima — só consulta quando a pessoa
  // realmente tem acesso à Central de Ética, senão até a EXISTÊNCIA de
  // uma denúncia vazaria pra quem não devia saber.
  const denunciasNovas =
    dentroDeTenant && responsavelEtica ? await buscarDenunciasNovas(sessao!.empresaEfetivoId!) : 0;

  return (
    <html lang="pt-BR" className={`${urbanist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SplashScreen />
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
            responsavelGed={responsavelGed}
            vagasAlertaCount={vagasAlertaCount}
          />
          {assinaturaAlerta && (
            <AlertaAssinaturaVencendo
              diasRestantes={assinaturaAlerta.diasRestantes}
              emTrial={assinaturaAlerta.emTrial}
              horasParaBloqueio={assinaturaAlerta.horasParaBloqueio}
            />
          )}
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
