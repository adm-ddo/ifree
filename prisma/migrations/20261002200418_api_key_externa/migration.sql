-- CreateTable
CREATE TABLE "ApiKeyExterna" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "chaveHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPorEmail" TEXT NOT NULL,
    "ultimoUsoEm" TIMESTAMP(3),
    "revogadaEm" TIMESTAMP(3),

    CONSTRAINT "ApiKeyExterna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyExterna_chaveHash_key" ON "ApiKeyExterna"("chaveHash");

-- CreateIndex
CREATE INDEX "ApiKeyExterna_empresaId_idx" ON "ApiKeyExterna"("empresaId");

-- AddForeignKey
ALTER TABLE "ApiKeyExterna" ADD CONSTRAINT "ApiKeyExterna_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
