-- CreateTable
CREATE TABLE "VagaMatchPassivo" (
    "id" SERIAL NOT NULL,
    "vagaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VagaMatchPassivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VagaMatchPassivo_vagaId_idx" ON "VagaMatchPassivo"("vagaId");

-- CreateIndex
CREATE UNIQUE INDEX "VagaMatchPassivo_vagaId_pessoaId_key" ON "VagaMatchPassivo"("vagaId", "pessoaId");

-- AddForeignKey
ALTER TABLE "VagaMatchPassivo" ADD CONSTRAINT "VagaMatchPassivo_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaMatchPassivo" ADD CONSTRAINT "VagaMatchPassivo_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
