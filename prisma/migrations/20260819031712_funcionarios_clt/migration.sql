-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('EXTRA', 'CLT');

-- CreateEnum
CREATE TYPE "EscalaTrabalho" AS ENUM ('CINCO_X_DOIS', 'SEIS_X_UM', 'DOZE_X_TRINTA_E_SEIS', 'OUTRA');

-- CreateEnum
CREATE TYPE "StatusRegistroPonto" AS ENUM ('ABERTO', 'CONCLUIDO', 'PENDENTE_CORRECAO');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "funcionariosBaterIntervalo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pessoa" ALTER COLUMN "chavePix" DROP NOT NULL,
ALTER COLUMN "tipoChavePix" DROP NOT NULL,
ALTER COLUMN "tipoChavePix" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "cargaHorariaSemanalMin" INTEGER,
ADD COLUMN     "escalaTrabalho" "EscalaTrabalho",
ADD COLUMN     "salarioMensal" DECIMAL(10,2),
ADD COLUMN     "tipoVinculo" "TipoVinculo" NOT NULL DEFAULT 'EXTRA';

-- CreateTable
CREATE TABLE "RegistroPonto" (
    "id" SERIAL NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "totemId" INTEGER,
    "horaEntrada" TIMESTAMP(3) NOT NULL,
    "entradaIntervalo" TIMESTAMP(3),
    "saidaIntervalo" TIMESTAMP(3),
    "horaSaida" TIMESTAMP(3),
    "minutosTrabalhados" INTEGER,
    "status" "StatusRegistroPonto" NOT NULL DEFAULT 'ABERTO',
    "fotoEntradaUrl" TEXT NOT NULL,
    "fotoSaidaUrl" TEXT,
    "fotoEntradaIntervaloUrl" TEXT,
    "fotoSaidaIntervaloUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroPonto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroPonto_empresaId_status_idx" ON "RegistroPonto"("empresaId", "status");

-- CreateIndex
CREATE INDEX "RegistroPonto_pessoaId_empresaId_status_idx" ON "RegistroPonto"("pessoaId", "empresaId", "status");

-- AddForeignKey
ALTER TABLE "RegistroPonto" ADD CONSTRAINT "RegistroPonto_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPonto" ADD CONSTRAINT "RegistroPonto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPonto" ADD CONSTRAINT "RegistroPonto_totemId_fkey" FOREIGN KEY ("totemId") REFERENCES "Totem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
