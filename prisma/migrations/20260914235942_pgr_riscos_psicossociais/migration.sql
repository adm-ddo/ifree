-- AlterTable: acesso restrito ao módulo PGR por membro da equipe
ALTER TABLE "UsuarioEmpresa" ADD COLUMN "responsavelPgr" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: quem já tinha acesso à empresa antes deste campo existir
-- mantém acesso ao PGR (ninguém perde acesso de surpresa) — só logins
-- novos daqui pra frente nascem sem a marcação.
UPDATE "UsuarioEmpresa" SET "responsavelPgr" = true;

-- AlterTable: link público da pesquisa anônima (gerado sob demanda)
ALTER TABLE "Empresa" ADD COLUMN "tokenPgr" TEXT;

-- CreateEnum
CREATE TYPE "StatusCicloPgr" AS ENUM ('ABERTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "StatusAcaoPgr" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "CicloPgr" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "status" "StatusCicloPgr" NOT NULL DEFAULT 'ABERTO',
    "abertoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" TIMESTAMP(3),

    CONSTRAINT "CicloPgr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaPgr" (
    "id" SERIAL NOT NULL,
    "cicloId" INTEGER NOT NULL,
    "cargo" TEXT,
    "respostas" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaPgr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcaoPgr" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "dimensao" TEXT NOT NULL,
    "descricaoRisco" TEXT NOT NULL,
    "medida" TEXT NOT NULL,
    "responsavel" TEXT,
    "prazo" DATE,
    "status" "StatusAcaoPgr" NOT NULL DEFAULT 'PENDENTE',
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcaoPgr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_tokenPgr_key" ON "Empresa"("tokenPgr");

-- CreateIndex
CREATE INDEX "CicloPgr_empresaId_status_idx" ON "CicloPgr"("empresaId", "status");

-- AddForeignKey
ALTER TABLE "CicloPgr" ADD CONSTRAINT "CicloPgr_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaPgr" ADD CONSTRAINT "RespostaPgr_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "CicloPgr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoPgr" ADD CONSTRAINT "AcaoPgr_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
