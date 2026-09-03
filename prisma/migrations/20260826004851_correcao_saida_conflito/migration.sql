-- AlterTable: auditoria de saída confirmada manualmente pelo dono (conflito
-- de turno aberto em outra empresa)
ALTER TABLE "Turno" ADD COLUMN "correcaoSaidaEm" TIMESTAMP(3);
ALTER TABLE "Turno" ADD COLUMN "correcaoSaidaPorEmail" TEXT;
