/** Catálogo fixo dos escopos que uma ApiKeyExterna pode ter liberados —
 * mesmo espírito de MODULOS_EQUIPE (src/lib/modulosEquipe.ts): catálogo em
 * código, sem tela de admin pra cadastrar escopo novo, `escopos` guardado
 * como String[] no Prisma e validado contra este catálogo na hora de
 * criar/checar (nunca confia em valor arbitrário vindo do form ou de uma
 * chave antiga que um escopo futuro tenha removido). Adicionar um novo
 * endpoint a esta API = adicionar uma linha aqui + checar em
 * autenticarApiExterna. */
export const ESCOPOS_API_EXTERNA = [
  {
    chave: "saldo",
    label: "Saldo Pix",
    descricao: "Saldo atual da conta (consulta ao vivo na Asaas) — GET /api/v1/financeiro/saldo.",
  },
  {
    chave: "pagamentos",
    label: "Pagamentos",
    descricao: "Pix efetivamente pagos num período — GET /api/v1/financeiro/pagamentos.",
  },
] as const;

export type EscopoApiExterna = (typeof ESCOPOS_API_EXTERNA)[number]["chave"];

const CHAVES_VALIDAS = new Set<string>(ESCOPOS_API_EXTERNA.map((e) => e.chave));

/** Filtra uma lista qualquer (vinda de FormData.getAll, por exemplo)
 * mantendo só chaves de escopo reais — mesmo padrão de
 * filtrarModulosValidos em src/lib/modulosEquipe.ts. */
export function filtrarEscoposValidos(valores: string[]): EscopoApiExterna[] {
  return valores.filter((v): v is EscopoApiExterna => CHAVES_VALIDAS.has(v));
}
