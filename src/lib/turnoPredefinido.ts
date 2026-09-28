import type { TurnoPredefinido } from "@/generated/prisma/enums";

/** Sem "server-only" de propósito — diferente de src/lib/turno.ts (que
 * importa e por isso não pode entrar em componente cliente), este arquivo
 * só tem constantes/labels, usadas tanto no servidor (checagem de horário
 * incomum) quanto em componentes cliente (selects, badges). */

/// As 3 categorias reais de turno pra checagem de horário incomum — LIVRE
/// fica de fora (é o "não verificar", nunca entra em turnosPermitidosEntrada).
export const TURNOS_ENTRADA: Exclude<TurnoPredefinido, "LIVRE">[] = [
  "MADRUGADA",
  "MANHA",
  "NOITE",
];

export const LABEL_TURNO_PREDEFINIDO: Record<TurnoPredefinido, string> = {
  MADRUGADA: "🌌 Madrugada",
  MANHA: "☀️ Manhã",
  NOITE: "🌙 Tarde/noite",
  LIVRE: "Livre",
};
