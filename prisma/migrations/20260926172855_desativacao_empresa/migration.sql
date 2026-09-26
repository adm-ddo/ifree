-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "desativadaEm" TIMESTAMP(3),
ADD COLUMN     "desativadaPorEmail" TEXT,
ADD COLUMN     "motivoDesativacao" TEXT;
