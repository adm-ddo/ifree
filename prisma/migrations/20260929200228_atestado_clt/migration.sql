-- CreateEnum
CREATE TYPE "TipoAtestadoClt" AS ENUM ('ATESTADO_MEDICO', 'LICENCA', 'OUTRO');

-- CreateTable
CREATE TABLE "AtestadoClt" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "tipo" "TipoAtestadoClt" NOT NULL DEFAULT 'ATESTADO_MEDICO',
    "arquivoUrl" TEXT,
    "registradoPorEmail" TEXT NOT NULL,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtestadoClt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtestadoClt_empresaId_pessoaId_idx" ON "AtestadoClt"("empresaId", "pessoaId");

-- AddForeignKey
ALTER TABLE "AtestadoClt" ADD CONSTRAINT "AtestadoClt_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtestadoClt" ADD CONSTRAINT "AtestadoClt_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
