-- AlterTable: novos textos editáveis de empresa (regulamento interno e contrato CLT)
ALTER TABLE "Empresa" ADD COLUMN "regulamentoInterno" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "contratoCltTermos" TEXT;

-- CreateEnum
CREATE TYPE "TipoDocumentoGed" AS ENUM ('ADVERTENCIA', 'SUSPENSAO', 'CONTRATO_TRABALHO');

-- CreateTable
CREATE TABLE "DocumentoGed" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "tipo" "TipoDocumentoGed" NOT NULL,
    "modeloId" INTEGER,
    "modeloNome" TEXT NOT NULL,
    "corpoTexto" TEXT NOT NULL,
    "dataDocumento" DATE NOT NULL,
    "snapshotDados" JSONB NOT NULL,
    "geradoPorEmail" TEXT NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivoAssinadoUrl" TEXT,
    "arquivoAssinadoEm" TIMESTAMP(3),
    "arquivoAssinadoPorEmail" TEXT,

    CONSTRAINT "DocumentoGed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloDocumentoGed" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" "TipoDocumentoGed" NOT NULL,
    "nome" TEXT NOT NULL,
    "corpoTexto" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeloDocumentoGed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoGed_empresaId_pessoaId_idx" ON "DocumentoGed"("empresaId", "pessoaId");

-- CreateIndex
CREATE INDEX "ModeloDocumentoGed_empresaId_tipo_idx" ON "ModeloDocumentoGed"("empresaId", "tipo");

-- AddForeignKey
ALTER TABLE "DocumentoGed" ADD CONSTRAINT "DocumentoGed_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoGed" ADD CONSTRAINT "DocumentoGed_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloDocumentoGed" ADD CONSTRAINT "ModeloDocumentoGed_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
