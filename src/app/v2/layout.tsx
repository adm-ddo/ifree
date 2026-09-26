import { Sora } from "next/font/google";
import { requireSessao } from "@/lib/auth";
import NavShell, { type ItemNavV2 } from "@/components/v2/NavShell";
import AlertasV2 from "@/components/v2/AlertasV2";
import { buscarDadosLayoutV2, type DadosLayoutV2 } from "@/lib/alertas";
import { MODULOS_EQUIPE } from "@/lib/modulosEquipe";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

/// Mesma lista de verdade de src/components/AppHeader.tsx (v1) — só com
/// ícone adicionado. Central de Ética/GED entram condicionalmente, igual
/// ao v1.
const ITENS_BASE: ItemNavV2[] = [
  { href: "/v2/dashboard", label: "Painel", icone: "dashboard" },
  { href: "/v2/funcoes", label: "Funções", icone: "funcoes" },
  { href: "/v2/freelancers", label: "Freelancers", icone: "freelancers" },
  { href: "/v2/vagas", label: "Vagas", icone: "vagas" },
  { href: "/v2/conversas", label: "Mensagens", icone: "mensagens" },
  { href: "/v2/funcionarios", label: "Funcionários", icone: "funcionarios" },
  { href: "/v2/turnos", label: "Turnos", icone: "turnos" },
  { href: "/v2/relatorios", label: "Relatórios", icone: "relatorios" },
  { href: "/v2/pagamentos", label: "Pagamentos", icone: "pagamentos" },
  { href: "/v2/financeiro", label: "Financeiro", icone: "financeiro" },
  { href: "/v2/estimativa-clt", label: "Estimativa CLT", icone: "estimativaClt" },
  { href: "/v2/totens", label: "Totens", icone: "totens" },
  { href: "/v2/configuracoes", label: "Configurações", icone: "configuracoes" },
];

/** Casca da v2 — nova barra lateral (computador) / abas fixas (celular),
 * fonte Sora e cor de marca em bloco, no visual aprovado (Direção 3
 * "Turno Vivo", ajustada). Renderizada por baixo do <html>/<body> do
 * layout raiz, sem o AppHeader/avisos do v1 — ver exclusão de "/v2" em
 * ChromeGate.tsx/MainWrapper.tsx, mesmo padrão já usado por
 * src/app/portal/layout.tsx.
 *
 * requireSessao aqui, NÃO requireTenant — o layout envolve TODA rota
 * /v2/**, inclusive /v2/assinatura e /v2/empresas, que precisam continuar
 * acessíveis mesmo sem empresa selecionada ou com ela bloqueada (mesmo
 * motivo do v1: usar requireTenant aqui criaria um loop, o próprio
 * bloqueio redirecionando pra uma rota que o layout bloquearia nela
 * mesma). Cada página que precisa de verdade de um tenant liberado
 * (dashboard, funcionários etc.) já chama requireTenant() por conta
 * própria — mesmo padrão do v1.
 *
 * As permissões (responsavelEtica/Ged/Pgr) e os avisos do topo vêm de
 * buscarDadosLayoutV2 (src/lib/alertas.ts), com cache curto de 20s — esse
 * layout roda de novo a cada navegação dentro de /v2/** (requireSessao usa
 * cookies, torna a rota dinâmica), então sem esse cache toda troca de tela
 * refazia ~10 consultas do zero só pra decidir o que mostrar na barra
 * lateral e nos avisos. Ver o comentário de buscarDadosLayoutV2 pro
 * raciocínio completo. */
export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const sessao = await requireSessao();
  const empresaId = sessao.empresaEfetivoId;

  const dadosLayout: DadosLayoutV2 =
    empresaId === null
      ? {
          responsavelEtica: false,
          responsavelGed: false,
          responsavelPgr: false,
          pagamentosPendentes: null,
          feriasAlerta: null,
          candidaturasEConversas: { candidaturasPendentes: 0, candidaturasPendentesComMatch: 0, mensagensConectaNaoLidas: 0 },
          experienciaAlerta: null,
          assinaturaAlerta: null,
          denunciasNovas: 0,
          pgrAlerta: null,
          modulosPermitidos: [],
          planoEmpresa: "COMPLETO",
        }
      : await buscarDadosLayoutV2(sessao.usuarioId, empresaId, sessao.isMaster);

  const {
    responsavelEtica,
    responsavelGed,
    responsavelPgr,
    pagamentosPendentes,
    feriasAlerta,
    candidaturasEConversas: { candidaturasPendentes, candidaturasPendentesComMatch },
    experienciaAlerta,
    assinaturaAlerta,
    denunciasNovas,
    pgrAlerta,
    modulosPermitidos,
    planoEmpresa,
  } = dadosLayout;

  // Módulo fora de modulosPermitidos vira: TRAVADO (vitrine do upsell, ver
  // UpsellModal em NavShell.tsx) quando é limite do plano Conecta, ou
  // ESCONDIDO (comportamento de sempre) quando é o próprio dono Completo
  // restringindo um convidado via /equipe — master nunca vê nada travado.
  // Painel nunca tem chave de módulo própria, fica sempre visível liberado.
  const bloqueiaPorPlano = !sessao.isMaster && planoEmpresa === "CONECTA";
  const hrefsLiberados = new Set<string>(
    MODULOS_EQUIPE.filter((m) => modulosPermitidos.includes(m.chave)).map((m) => m.hrefV2)
  );
  const itens: ItemNavV2[] = [
    ...ITENS_BASE.filter((item) => item.href === "/v2/dashboard" || hrefsLiberados.has(item.href) || bloqueiaPorPlano).map(
      (item) => (hrefsLiberados.has(item.href) || item.href === "/v2/dashboard" ? item : { ...item, bloqueado: true })
    ),
    ...(responsavelEtica ? [{ href: "/v2/etica", label: "Central de Ética", icone: "etica" as const }] : []),
    ...(responsavelGed ? [{ href: "/v2/ged", label: "GED", icone: "ged" as const }] : []),
    ...(responsavelPgr ? [{ href: "/v2/pgr", label: "PGR", icone: "pgr" as const }] : []),
  ];

  return (
    <div className={`${sora.variable} font-v2 min-h-full`}>
      <NavShell
        itens={itens}
        nomeEmpresa={sessao.empresaEfetivoNome ?? "iFREE"}
        mostrarEmpresas={!sessao.isMaster}
        masterEmEmpresa={sessao.isMaster && empresaId !== null}
        alertas={
          <AlertasV2
            assinaturaAlerta={assinaturaAlerta}
            denunciasNovas={denunciasNovas}
            candidaturasPendentes={candidaturasPendentes}
            candidaturasPendentesComMatch={candidaturasPendentesComMatch}
            pagamentosPendentes={pagamentosPendentes}
            feriasAlerta={feriasAlerta}
            experienciaAlerta={experienciaAlerta}
            pgrAlerta={pgrAlerta}
          />
        }
      >
        {children}
      </NavShell>
    </div>
  );
}
