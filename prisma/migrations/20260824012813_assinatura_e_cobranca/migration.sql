-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TRIAL', 'ATIVA', 'ATRASADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'PAGA', 'EXPIRADA', 'CANCELADA');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "assinaturaVenceEm" TIMESTAMP(3),
ADD COLUMN     "statusAssinatura" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "valorMensalidade" DECIMAL(10,2);

-- Backfill: empresas que já existiam antes deste controle de assinatura
-- existir são tratadas como já ativas, sem vencimento — não é justo
-- colocar um cronômetro de trial em quem já é cliente de verdade. Só
-- empresas cadastradas DAQUI PRA FRENTE nascem em TRIAL de verdade.
UPDATE "Empresa" SET "statusAssinatura" = 'ATIVA';

-- CreateTable
CREATE TABLE "CobrancaMensalidade" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "referenciaMes" TEXT NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "idTransacaoExterna" TEXT,
    "qrCode" TEXT,
    "qrCodeImagemUrl" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CobrancaMensalidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CobrancaMensalidade_empresaId_status_idx" ON "CobrancaMensalidade"("empresaId", "status");

-- AddForeignKey
ALTER TABLE "CobrancaMensalidade" ADD CONSTRAINT "CobrancaMensalidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
