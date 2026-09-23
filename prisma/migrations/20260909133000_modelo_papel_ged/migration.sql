-- CreateTable
CREATE TABLE "ModeloPapelGed" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "arquivoUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "criadoPorEmail" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeloPapelGed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModeloPapelGed_empresaId_idx" ON "ModeloPapelGed"("empresaId");

-- AddForeignKey
ALTER TABLE "ModeloPapelGed" ADD CONSTRAINT "ModeloPapelGed_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
