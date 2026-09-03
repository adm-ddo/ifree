-- AlterTable: opt-in do freelancer pro quadro de vagas
ALTER TABLE "Pessoa" ADD COLUMN "disponivelParaOportunidades" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "StatusVaga" AS ENUM ('ABERTA', 'PAUSADA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "StatusCandidatura" AS ENUM ('ENVIADA', 'ACEITA', 'RECUSADA');

-- CreateTable
CREATE TABLE "Vaga" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "cargo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "localizacao" TEXT,
    "status" "StatusVaga" NOT NULL DEFAULT 'ABERTA',
    "criadoPorEmail" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidatura" (
    "id" SERIAL NOT NULL,
    "vagaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "status" "StatusCandidatura" NOT NULL DEFAULT 'ENVIADA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vaga_status_idx" ON "Vaga"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Candidatura_vagaId_pessoaId_key" ON "Candidatura"("vagaId", "pessoaId");

-- AddForeignKey
ALTER TABLE "Vaga" ADD CONSTRAINT "Vaga_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
