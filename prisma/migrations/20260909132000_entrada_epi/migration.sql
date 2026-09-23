-- CreateTable
CREATE TABLE "EntradaEpi" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "dataEntrega" DATE NOT NULL,
    "observacao" TEXT,
    "registradoPorEmail" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntradaEpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntradaEpi_empresaId_pessoaId_idx" ON "EntradaEpi"("empresaId", "pessoaId");

-- AddForeignKey
ALTER TABLE "EntradaEpi" ADD CONSTRAINT "EntradaEpi_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaEpi" ADD CONSTRAINT "EntradaEpi_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
