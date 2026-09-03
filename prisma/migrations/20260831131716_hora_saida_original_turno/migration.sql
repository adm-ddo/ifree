-- AlterTable: preserva o horário de saída inventado pelo fechamento
-- automático antes da primeira correção manual (ver Turno.horaSaidaOriginal
-- no schema pro contexto completo).
ALTER TABLE "Turno" ADD COLUMN "horaSaidaOriginal" TIMESTAMP(3);
