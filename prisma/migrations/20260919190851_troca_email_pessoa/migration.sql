-- AlterEnum
ALTER TYPE "TipoTokenAutenticacao" ADD VALUE 'TROCA_EMAIL';

-- AlterTable
ALTER TABLE "TokenAutenticacaoPessoa" ADD COLUMN     "novoEmailPendente" TEXT;
