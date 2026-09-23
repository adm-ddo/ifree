/** Catálogo fixo dos módulos que um acesso secundário de equipe pode ter
 * liberados (UsuarioEmpresa.modulosPermitidos / ConviteEquipe.modulosPermitidos)
 * — mesmo espírito de catálogo-em-código de MODELOS_PADRAO_ADVERTENCIA/
 * TERMOS_CIENCIA_PADRAO em src/lib/ged.ts, sem UI de edição pela empresa.
 * "Painel" (dashboard) fica de fora de propósito: é a tela de pouso,
 * sempre visível pra quem tem acesso à empresa, senão não haveria pra
 * onde mandar alguém sem nenhum módulo liberado ainda. Central de
 * Ética/GED/PGR também ficam de fora — já têm flag própria
 * (responsavelEtica/Ged/Pgr em UsuarioEmpresa), telas sensíveis
 * separadas, não fazem parte deste catálogo.
 *
 * SEM "server-only" de propósito: catálogo puro de dados, usado tanto no
 * servidor (requireModulo, ver src/lib/requireModulo.ts) quanto direto em
 * componentes client (grade de checkbox em ConvidarPorLinkForm.tsx,
 * MembroRow.tsx, ConvitesEquipeList.tsx). A checagem de permissão de
 * verdade (que precisa de prisma/auth) fica isolada em
 * src/lib/requireModulo.ts, que aí sim é server-only. */
export const MODULOS_EQUIPE = [
  { chave: "funcoes", label: "Funções", hrefV1: "/funcoes", hrefV2: "/v2/funcoes" },
  { chave: "freelancers", label: "Freelancers", hrefV1: "/freelancers", hrefV2: "/v2/freelancers" },
  { chave: "vagas", label: "Vagas", hrefV1: "/vagas", hrefV2: "/v2/vagas" },
  { chave: "conversas", label: "Mensagens", hrefV1: "/conversas", hrefV2: "/v2/conversas" },
  { chave: "funcionarios", label: "Funcionários", hrefV1: "/funcionarios", hrefV2: "/v2/funcionarios" },
  { chave: "turnos", label: "Turnos", hrefV1: "/turnos", hrefV2: "/v2/turnos" },
  { chave: "relatorios", label: "Relatórios", hrefV1: "/relatorios", hrefV2: "/v2/relatorios" },
  { chave: "pagamentos", label: "Pagamentos", hrefV1: "/pagamentos", hrefV2: "/v2/pagamentos" },
  { chave: "financeiro", label: "Financeiro", hrefV1: "/financeiro", hrefV2: "/v2/financeiro" },
  { chave: "estimativaClt", label: "Estimativa CLT", hrefV1: "/estimativa-clt", hrefV2: "/v2/estimativa-clt" },
  { chave: "totens", label: "Totens", hrefV1: "/totens", hrefV2: "/v2/totens" },
  { chave: "configuracoes", label: "Configurações", hrefV1: "/configuracoes", hrefV2: "/v2/configuracoes" },
] as const;

export type ModuloEquipe = (typeof MODULOS_EQUIPE)[number]["chave"];

export const CHAVES_TODOS_MODULOS: ModuloEquipe[] = MODULOS_EQUIPE.map((m) => m.chave);

const CHAVES_VALIDAS = new Set<string>(CHAVES_TODOS_MODULOS);

/** Filtra uma lista qualquer (vinda de FormData, por exemplo) mantendo só
 * chaves de módulo reais — nunca confia em módulo arbitrário vindo do
 * cliente (ConviteEquipe/UsuarioEmpresa só devem guardar chaves do
 * catálogo acima). */
export function filtrarModulosValidos(valores: string[]): ModuloEquipe[] {
  return valores.filter((v): v is ModuloEquipe => CHAVES_VALIDAS.has(v));
}
