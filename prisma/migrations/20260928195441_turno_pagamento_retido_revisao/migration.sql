-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "correcaoEntradaEm" TIMESTAMP(3),
ADD COLUMN     "correcaoEntradaPorEmail" TEXT,
ADD COLUMN     "horaEntradaOriginal" TIMESTAMP(3),
ADD COLUMN     "pagamentoRetidoRevisao" BOOLEAN NOT NULL DEFAULT false;
