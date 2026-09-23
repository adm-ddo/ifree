/// Banco de perguntas da pesquisa anônima de riscos psicossociais (PGR,
/// NR-1) — fixo no código nesta versão (sem edição pela empresa ainda),
/// mesmo espírito de MODELOS_PADRAO_ADVERTENCIA em src/lib/ged.ts. As 7
/// dimensões e o estilo de pergunta (frequência, escala 1-5) são
/// inspirados nas dimensões usadas por instrumentos validados de
/// avaliação de risco psicossocial (modelo demanda-controle-suporte de
/// Karasek, as 7 dimensões do HSE Management Standards Indicator Tool,
/// COPSOQ) — NÃO é uma reprodução licenciada de nenhum desses
/// instrumentos específicos. Isso cobre a ferramenta (aplicar, coletar,
/// agregar), não substitui a responsabilidade técnica de um profissional
/// de segurança do trabalho revisar o conteúdo antes da empresa assinar
/// o documento final como PGR oficial — mesmo aviso já mostrado na tela
/// e no PDF gerado (ver src/lib/pgr-pdf.tsx).
/// Sem "server-only": usado tanto no formulário público (client) quanto
/// no cálculo da matriz (server).

export type DimensaoPgr =
  | "DEMANDA_CARGA"
  | "AUTONOMIA_CONTROLE"
  | "SUPORTE_SOCIAL"
  | "CLAREZA_PAPEL"
  | "RELACIONAMENTOS_ASSEDIO"
  | "MUDANCA_ORGANIZACIONAL"
  | "EQUILIBRIO_TRABALHO_VIDA";

export const LABEL_DIMENSAO_PGR: Record<DimensaoPgr, string> = {
  DEMANDA_CARGA: "Demanda e carga de trabalho",
  AUTONOMIA_CONTROLE: "Autonomia e controle",
  SUPORTE_SOCIAL: "Suporte social",
  CLAREZA_PAPEL: "Clareza de papel",
  RELACIONAMENTOS_ASSEDIO: "Relacionamentos e assédio",
  MUDANCA_ORGANIZACIONAL: "Mudança organizacional e insegurança",
  EQUILIBRIO_TRABALHO_VIDA: "Equilíbrio trabalho-vida",
};

export const ORDEM_DIMENSOES_PGR: DimensaoPgr[] = [
  "DEMANDA_CARGA",
  "AUTONOMIA_CONTROLE",
  "SUPORTE_SOCIAL",
  "CLAREZA_PAPEL",
  "RELACIONAMENTOS_ASSEDIO",
  "MUDANCA_ORGANIZACIONAL",
  "EQUILIBRIO_TRABALHO_VIDA",
];

export type PerguntaPgr = {
  id: string;
  dimensao: DimensaoPgr;
  texto: string;
  /// true quando a pergunta é formulada de forma positiva (ex.: "recebo
  /// apoio...") — nesse caso responder "sempre" é um sinal BOM, então o
  /// valor precisa ser invertido (6 - valor) antes de somar como risco.
  /// false quando a pergunta já é formulada como fator de risco (ex.:
  /// "preciso trabalhar sob pressão...") — "sempre" já significa risco
  /// alto, sem inverter.
  invertido: boolean;
};

export const OPCOES_LIKERT_PGR: { valor: number; label: string }[] = [
  { valor: 1, label: "Nunca" },
  { valor: 2, label: "Raramente" },
  { valor: 3, label: "Às vezes" },
  { valor: 4, label: "Frequentemente" },
  { valor: 5, label: "Sempre" },
];

export const PERGUNTAS_PGR: PerguntaPgr[] = [
  // Demanda e carga de trabalho
  { id: "demanda_1", dimensao: "DEMANDA_CARGA", texto: "Eu preciso trabalhar muito rápido para dar conta das minhas tarefas.", invertido: false },
  { id: "demanda_2", dimensao: "DEMANDA_CARGA", texto: "Eu tenho mais trabalho do que consigo terminar no meu horário normal.", invertido: false },
  { id: "demanda_3", dimensao: "DEMANDA_CARGA", texto: "Eu preciso trabalhar sob pressão de prazos apertados.", invertido: false },

  // Autonomia e controle
  { id: "autonomia_1", dimensao: "AUTONOMIA_CONTROLE", texto: "Eu posso decidir a ordem em que faço minhas tarefas.", invertido: true },
  { id: "autonomia_2", dimensao: "AUTONOMIA_CONTROLE", texto: "Eu tenho liberdade para propor mudanças na forma como meu trabalho é feito.", invertido: true },
  { id: "autonomia_3", dimensao: "AUTONOMIA_CONTROLE", texto: "Eu consigo fazer pausas quando preciso durante o expediente.", invertido: true },

  // Suporte social
  { id: "suporte_1", dimensao: "SUPORTE_SOCIAL", texto: "Eu recebo apoio do meu superior direto quando preciso.", invertido: true },
  { id: "suporte_2", dimensao: "SUPORTE_SOCIAL", texto: "Eu recebo apoio dos meus colegas quando preciso.", invertido: true },
  { id: "suporte_3", dimensao: "SUPORTE_SOCIAL", texto: "Existe um bom ambiente de cooperação entre as pessoas da minha equipe.", invertido: true },

  // Clareza de papel
  { id: "clareza_1", dimensao: "CLAREZA_PAPEL", texto: "Eu sei exatamente o que se espera de mim no trabalho.", invertido: true },
  { id: "clareza_2", dimensao: "CLAREZA_PAPEL", texto: "Fica claro pra mim quais são minhas responsabilidades.", invertido: true },
  { id: "clareza_3", dimensao: "CLAREZA_PAPEL", texto: "Eu recebo informações claras sobre como meu trabalho está sendo avaliado.", invertido: true },

  // Relacionamentos e assédio
  { id: "relacoes_1", dimensao: "RELACIONAMENTOS_ASSEDIO", texto: "Eu presencio ou sofro tratamento desrespeitoso (gritos, humilhação, ironia) no trabalho.", invertido: false },
  { id: "relacoes_2", dimensao: "RELACIONAMENTOS_ASSEDIO", texto: "Eu sinto medo de represália se discordar de alguém superior a mim.", invertido: false },
  { id: "relacoes_3", dimensao: "RELACIONAMENTOS_ASSEDIO", texto: "Eu presencio ou sofro comentários de conotação sexual indesejados no ambiente de trabalho.", invertido: false },

  // Mudança organizacional e insegurança
  { id: "mudanca_1", dimensao: "MUDANCA_ORGANIZACIONAL", texto: "Eu me sinto inseguro(a) sobre meu futuro no meu emprego.", invertido: false },
  { id: "mudanca_2", dimensao: "MUDANCA_ORGANIZACIONAL", texto: "Mudanças na empresa acontecem sem eu ser informado(a) com antecedência.", invertido: false },
  { id: "mudanca_3", dimensao: "MUDANCA_ORGANIZACIONAL", texto: "Eu me preocupo em ser demitido(a) ou ter meu cargo alterado sem aviso.", invertido: false },

  // Equilíbrio trabalho-vida
  { id: "equilibrio_1", dimensao: "EQUILIBRIO_TRABALHO_VIDA", texto: "Meu trabalho invade meu tempo de descanso ou vida pessoal.", invertido: false },
  { id: "equilibrio_2", dimensao: "EQUILIBRIO_TRABALHO_VIDA", texto: "Eu saio do trabalho me sentindo esgotado(a) fisicamente ou emocionalmente.", invertido: false },
  { id: "equilibrio_3", dimensao: "EQUILIBRIO_TRABALHO_VIDA", texto: "Eu penso em assuntos do trabalho mesmo fora do expediente, de um jeito que me incomoda.", invertido: false },
];

/// Faixa de classificação da média de risco (1-5, já com inversão
/// aplicada — sempre "quanto maior, pior") por dimensão.
export type NivelRiscoPgr = "BAIXO" | "MEDIO" | "ALTO";

export function classificarRiscoPgr(mediaRisco: number): NivelRiscoPgr {
  if (mediaRisco >= 3.5) return "ALTO";
  if (mediaRisco >= 2.5) return "MEDIO";
  return "BAIXO";
}

export const LABEL_NIVEL_RISCO_PGR: Record<NivelRiscoPgr, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
};

export const COR_NIVEL_RISCO_PGR: Record<NivelRiscoPgr, string> = {
  BAIXO: "bg-brand-50 text-brand-700 border-brand-200",
  MEDIO: "bg-amber-50 text-amber-700 border-amber-200",
  ALTO: "bg-red-50 text-red-700 border-red-200",
};

/// Menos que isso de respostas num recorte (por cargo, ou no total do
/// ciclo) e o resultado não é exibido separado — protege contra
/// reidentificação numa empresa pequena. Ver calcularMatrizPgr em
/// src/lib/pgr.ts.
export const MINIMO_RESPOSTAS_RECORTE_PGR = 5;
