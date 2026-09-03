import type { CategoriaDenuncia, StatusDenuncia } from "@/generated/prisma/enums";

/** Constantes puras (sem Prisma/server-only) — separadas de src/lib/etica.ts
 * de propósito, pra poderem ser importadas por componentes cliente
 * (formulários, stepper) sem puxar o Prisma/pg pro bundle do browser. */

export const CATEGORIAS_DENUNCIA: { valor: CategoriaDenuncia; label: string }[] = [
  { valor: "ASSEDIO_MORAL", label: "Assédio moral" },
  { valor: "ASSEDIO_SEXUAL", label: "Assédio sexual" },
  { valor: "DISCRIMINACAO", label: "Discriminação" },
  { valor: "RISCO_PSICOSSOCIAL", label: "Risco psicossocial / saúde mental" },
  { valor: "SEGURANCA_TRABALHO", label: "Segurança do trabalho" },
  { valor: "CORRUPCAO_FRAUDE", label: "Corrupção / fraude" },
  { valor: "CONFLITO_INTERESSES", label: "Conflito de interesses" },
  { valor: "DESCUMPRIMENTO_NORMAS", label: "Descumprimento de normas trabalhistas" },
  { valor: "RETALIACAO", label: "Retaliação" },
  { valor: "OUTROS", label: "Outros" },
];

export const LABEL_CATEGORIA_DENUNCIA: Record<CategoriaDenuncia, string> = Object.fromEntries(
  CATEGORIAS_DENUNCIA.map((c) => [c.valor, c.label])
) as Record<CategoriaDenuncia, string>;

/// Ordem oficial do fluxo — usada tanto pro stepper quanto pra validar
/// avanço de etapa (a empresa pode escolher qualquer uma, pra frente ou
/// pra trás, mas a ORDEM exibida é sempre esta).
export const STATUS_DENUNCIA_ORDEM: StatusDenuncia[] = [
  "RECEBIDO",
  "TRIAGEM",
  "EM_INVESTIGACAO",
  "AGUARDANDO_INFORMACOES",
  "PARECER_EMITIDO",
  "PROVIDENCIAS",
  "FINALIZADO",
];

export const LABEL_STATUS_DENUNCIA: Record<StatusDenuncia, string> = {
  RECEBIDO: "Recebido",
  TRIAGEM: "Triagem",
  EM_INVESTIGACAO: "Em investigação",
  AGUARDANDO_INFORMACOES: "Aguardando informações",
  PARECER_EMITIDO: "Parecer emitido",
  PROVIDENCIAS: "Providências",
  FINALIZADO: "Finalizado",
};
