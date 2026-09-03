/** Sugestões de chips pro perfil do Portal, organizadas por categoria —
 * nicho de trabalho físico e presencial (mesmo foco de /conecta), não um
 * vocabulário fechado: a pessoa pode digitar qualquer coisa além dessas
 * sugestões (ver "+ adicionar" na UI). "Habilidade" (o que ela já sabe
 * fazer) e "vaga desejada" (o que ela quer exercer) usam a mesma
 * taxonomia de cargos — faz sentido pro mesmo cargo aparecer nas duas
 * perguntas. */
export type CategoriaSugestoes = { categoria: string; itens: readonly string[] };

const CATEGORIAS_CARGOS: readonly CategoriaSugestoes[] = [
  {
    categoria: "Frente / Atendimento / Balcão",
    itens: [
      "Atendente",
      "Garçom/Garçonete",
      "Cumim",
      "Barista",
      "Bartender",
      "Barback",
      "Caixa",
      "Recepção de eventos",
      "Expedidor(a) de delivery",
    ],
  },
  {
    categoria: "Cozinha",
    itens: [
      "Cozinheiro(a)",
      "Auxiliar de cozinha",
      "Chapista",
      "Churrasqueiro(a)",
      "Pizzaiolo(a)",
      "Auxiliar de pizzaiolo",
      "Sushiman",
      "Auxiliar de sushi",
      "Saladeiro(a)",
      "Confeiteiro(a)",
      "Auxiliar de confeitaria",
      "Padeiro(a)",
      "Auxiliar de padaria",
      "Copeira/o",
    ],
  },
  {
    categoria: "Liderança e gestão",
    itens: [
      "Gerente",
      "Subgerente",
      "Supervisor(a)",
      "Coordenador(a)",
      "Líder de equipe",
      "Chefe de cozinha",
      "Chefe de salão",
      "Chefe de bar",
      "Maître",
      "Coordenador(a) de reservas",
      "Coordenador(a) de atendimento",
    ],
  },
  {
    categoria: "Entrega",
    itens: ["Entregador(a)", "Motoboy", "Freteiro(a)", "Empacotador(a)", "Ajudante"],
  },
  {
    categoria: "Hotelaria",
    itens: ["Recepção", "Camareira/o"],
  },
  {
    categoria: "Limpeza",
    itens: ["Auxiliar de limpeza", "Serviços gerais"],
  },
  {
    categoria: "Mercados",
    itens: [
      "Repositor(a)",
      "Empacotador(a)",
      "Padeiro(a)",
      "Auxiliar de padaria",
      "Açougueiro(a)",
      "Auxiliar de açougueiro(a)",
      "Retaguarda de caixa",
    ],
  },
  {
    categoria: "Shows e eventos",
    itens: [
      "Montagem",
      "Desmontagem",
      "Carregamento",
      "Segurança",
      "Vigia",
      "Fiscal de portaria",
      "Fiscal de bar",
      "Bartender",
      "Serviços de estacionamento",
      "Manobrista",
      "Bilheteria",
      "Credenciamento",
      "Monitor(a)",
      "Hoster",
      "Promotor(a) de eventos",
      "Produtor(a) de palco",
      "Instrumentista",
      "Eletricista",
      "Fotógrafo(a)",
      "Auxiliar de copa",
      "Motorista",
    ],
  },
  {
    categoria: "Administrativo",
    itens: ["Auxiliar administrativo", "Assistente financeiro", "Financeiro"],
  },
  {
    categoria: "Outros",
    itens: ["Estoque", "Carga e descarga", "Manutenção geral"],
  },
];

export const HABILIDADES_SUGERIDAS: readonly CategoriaSugestoes[] = CATEGORIAS_CARGOS;
export const VAGAS_SUGERIDAS: readonly CategoriaSugestoes[] = CATEGORIAS_CARGOS;

/** Lista achatada e sem duplicata de todos os cargos das categorias acima
 * — usada como sugestão (datalist) no campo "cargo" da vaga publicada
 * pela empresa (src/app/vagas/NovaVagaForm.tsx), que é um valor único,
 * não uma lista de chips como habilidades/vagas desejadas. */
export const TODOS_OS_CARGOS: readonly string[] = [
  ...new Set(CATEGORIAS_CARGOS.flatMap((c) => c.itens)),
];

const MAX_ITENS = 16;
const MAX_CARACTERES = 40;

/** Normaliza uma lista de tags vinda do client (habilidades ou vagas
 * desejadas): nunca confia no que chegou — corta espaço, descarta vazio,
 * remove duplicata ignorando maiúscula/minúscula (mantém a primeira
 * grafia), e limita quantidade/tamanho pra não deixar alguém mandar um
 * payload gigante. Diferente de tagsValidadas (src/lib/avaliacao.ts), que
 * descarta tudo fora de um vocabulário fechado — aqui o vocabulário é só
 * sugestão, texto livre é esperado. */
export function normalizarTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const vistos = new Set<string>();
  const resultado: string[] = [];

  for (const item of input) {
    if (typeof item !== "string") continue;
    const tag = item.trim().slice(0, MAX_CARACTERES);
    if (!tag) continue;
    const chave = tag.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(tag);
    if (resultado.length >= MAX_ITENS) break;
  }

  return resultado;
}
