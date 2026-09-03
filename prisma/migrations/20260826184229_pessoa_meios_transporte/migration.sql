-- AlterTable: como a pessoa costuma chegar no trabalho (perfil do Portal)
ALTER TABLE "Pessoa" ADD COLUMN "meiosTransporte" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
