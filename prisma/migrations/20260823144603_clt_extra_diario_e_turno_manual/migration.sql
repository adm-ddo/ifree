-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "criadoManualmente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "criadoManualmentePorEmail" TEXT,
ALTER COLUMN "fotoEntradaUrl" DROP NOT NULL,
ALTER COLUMN "assinaturaContratoUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "permiteExtraDiario" BOOLEAN NOT NULL DEFAULT false;
