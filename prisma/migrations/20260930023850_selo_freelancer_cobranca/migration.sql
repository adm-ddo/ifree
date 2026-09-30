-- CreateEnum
CREATE TYPE "SeloFreelancer" AS ENUM ('BRONZE', 'PRATA', 'OURO');

-- AlterTable
ALTER TABLE "Pessoa" ADD COLUMN     "clienteAsaasSeloId" TEXT,
ADD COLUMN     "selo" "SeloFreelancer" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "seloVenceEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CobrancaSelo" (
    "id" SERIAL NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "selo" "SeloFreelancer" NOT NULL,
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

    CONSTRAINT "CobrancaSelo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CobrancaSelo_pessoaId_status_idx" ON "CobrancaSelo"("pessoaId", "status");

-- AddForeignKey
ALTER TABLE "CobrancaSelo" ADD CONSTRAINT "CobrancaSelo_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
