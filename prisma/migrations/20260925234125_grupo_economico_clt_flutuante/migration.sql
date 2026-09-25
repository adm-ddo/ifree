-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "grupoEconomicoId" INTEGER;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "podeBaterPontoNoGrupo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GrupoEconomico" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrupoEconomico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_grupoEconomicoId_fkey" FOREIGN KEY ("grupoEconomicoId") REFERENCES "GrupoEconomico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
