-- CreateEnum
CREATE TYPE "PlanoEmpresa" AS ENUM ('CONECTA', 'COMPLETO');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "planoCompletoDesde" TIMESTAMP(3),
ADD COLUMN     "planoEmpresa" "PlanoEmpresa" NOT NULL DEFAULT 'COMPLETO';
