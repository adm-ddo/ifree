-- CreateEnum
CREATE TYPE "ModoPagamento" AS ENUM ('HORA', 'DIARIA');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "diariaLimiarMeiaMin" INTEGER NOT NULL DEFAULT 240;
ALTER TABLE "Empresa" ADD COLUMN "diariaLimiarCompletaMin" INTEGER NOT NULL DEFAULT 360;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN "modoPagamento" "ModoPagamento" NOT NULL DEFAULT 'HORA';
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN "valorDiaria" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "modoPagamentoAplicado" "ModoPagamento" NOT NULL DEFAULT 'HORA';
ALTER TABLE "Turno" ADD COLUMN "valorDiariaAplicada" DECIMAL(10,2);
