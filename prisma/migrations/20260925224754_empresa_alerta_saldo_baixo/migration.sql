-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "alertaSaldoBaixoAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alertaSaldoBaixoNotificadoEm" TIMESTAMP(3),
ADD COLUMN     "alertaSaldoBaixoSextaNotificadoEm" TIMESTAMP(3),
ADD COLUMN     "alertaSaldoBaixoValorMinimo" DECIMAL(10,2);
