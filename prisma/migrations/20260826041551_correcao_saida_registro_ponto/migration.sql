-- AlterTable: auditoria de saída confirmada manualmente pelo dono, no
-- RegistroPonto (espelha o que já existe em Turno.correcaoSaidaEm/PorEmail)
ALTER TABLE "RegistroPonto" ADD COLUMN "correcaoSaidaEm" TIMESTAMP(3);
ALTER TABLE "RegistroPonto" ADD COLUMN "correcaoSaidaPorEmail" TEXT;
