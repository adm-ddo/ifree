/// Constantes/tipos compartilhados entre MatchesRecentesBanner.tsx,
/// CandidatosCompativeisExpandido.tsx e a action buscarMaisCandidatosCompativeis
/// (actions.ts) — precisam ficar FORA de actions.ts porque um arquivo
/// "use server" só pode exportar função async (nada de const/type),
/// ver https://nextjs.org/docs/app/api-reference/directives/use-server.

/// Janela "recente" mostrada direto no banner, sem precisar clicar em
/// nada — pedido do Thiago em 2026-09-28: antes era 14 dias corridos,
/// virando uma lista grande com gente que já não era tão "recente" assim.
export const JANELA_RECENTE_HORAS = 24;

/// Limite absoluto de "buscar mais" — depois disso o match passivo para
/// de aparecer aqui (a empresa ainda pode achar a pessoa se ela se
/// candidatar de verdade depois). Evita a lista crescer pra sempre com
/// gente cada vez mais antiga.
export const JANELA_MAXIMA_HORAS = 72;

export const CANDIDATOS_POR_PAGINA = 10;

export type CandidatoCompativelItem = {
  id: number;
  pessoaId: number;
  pessoaNome: string;
  vagaId: number;
  vagaCargo: string;
  convidadoEm: string | null;
};

export type BuscarMaisCandidatosResultado = {
  itens: CandidatoCompativelItem[];
  totalPaginas: number;
  paginaAtual: number;
};
