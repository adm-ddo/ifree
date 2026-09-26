-- CreateEnum
CREATE TYPE "CategoriaVaga" AS ENUM ('RESTAURANTE', 'EVENTO', 'OUTRO');

-- AlterTable
ALTER TABLE "Vaga" ADD COLUMN     "categoria" "CategoriaVaga" NOT NULL DEFAULT 'OUTRO';
