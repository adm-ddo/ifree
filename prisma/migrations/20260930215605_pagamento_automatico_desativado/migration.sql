-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "motivoCancelamento" TEXT;

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "pagamentoAutomaticoDesativado" BOOLEAN NOT NULL DEFAULT false;
