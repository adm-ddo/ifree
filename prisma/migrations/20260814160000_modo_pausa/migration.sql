-- CreateEnum
CREATE TYPE "ModoPausa" AS ENUM ('NENHUMA', 'AUTOMATICA_30', 'AUTOMATICA_60');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "modoPausa" "ModoPausa" NOT NULL DEFAULT 'NENHUMA';

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "minutosDescontadosPausa" INTEGER;
