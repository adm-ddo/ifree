-- AlterTable: acesso restrito à Central de Ética por membro da equipe
ALTER TABLE "UsuarioEmpresa" ADD COLUMN "responsavelEtica" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: quem já tinha acesso à empresa antes deste campo existir
-- mantém acesso à Central de Ética (ninguém perde acesso de surpresa) —
-- só logins novos daqui pra frente nascem sem a marcação.
UPDATE "UsuarioEmpresa" SET "responsavelEtica" = true;

-- AlterTable: link público do canal (gerado sob demanda) e SLA configurável
ALTER TABLE "Empresa" ADD COLUMN "tokenDenuncia" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "slaDenunciaDias" INTEGER NOT NULL DEFAULT 30;

-- CreateEnum
CREATE TYPE "CategoriaDenuncia" AS ENUM ('ASSEDIO_MORAL', 'ASSEDIO_SEXUAL', 'DISCRIMINACAO', 'RISCO_PSICOSSOCIAL', 'SEGURANCA_TRABALHO', 'CORRUPCAO_FRAUDE', 'CONFLITO_INTERESSES', 'DESCUMPRIMENTO_NORMAS', 'RETALIACAO', 'OUTROS');

-- CreateEnum
CREATE TYPE "GravidadeDenuncia" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "StatusDenuncia" AS ENUM ('RECEBIDO', 'TRIAGEM', 'EM_INVESTIGACAO', 'AGUARDANDO_INFORMACOES', 'PARECER_EMITIDO', 'PROVIDENCIAS', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "AutorMensagemDenuncia" AS ENUM ('EMPRESA', 'DENUNCIANTE');

-- CreateTable
CREATE TABLE "Denuncia" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "protocolo" TEXT NOT NULL,
    "senhaHash" TEXT,
    "identificado" BOOLEAN NOT NULL DEFAULT false,
    "pessoaId" INTEGER,
    "categoria" "CategoriaDenuncia" NOT NULL,
    "descricao" TEXT NOT NULL,
    "gravidade" "GravidadeDenuncia",
    "status" "StatusDenuncia" NOT NULL DEFAULT 'RECEBIDO',
    "prazoSlaEm" TIMESTAMP(3) NOT NULL,
    "finalizadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemDenuncia" (
    "id" SERIAL NOT NULL,
    "denunciaId" INTEGER NOT NULL,
    "autor" "AutorMensagemDenuncia" NOT NULL,
    "autorEmail" TEXT,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemDenuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtapaDenuncia" (
    "id" SERIAL NOT NULL,
    "denunciaId" INTEGER NOT NULL,
    "status" "StatusDenuncia" NOT NULL,
    "observacao" TEXT,
    "autorEmail" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtapaDenuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoriaDenuncia" (
    "id" SERIAL NOT NULL,
    "denunciaId" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhe" TEXT,
    "autorEmail" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoriaDenuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoDenunciaAnonima" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "denunciaId" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoDenunciaAnonima_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_tokenDenuncia_key" ON "Empresa"("tokenDenuncia");

-- CreateIndex
CREATE UNIQUE INDEX "Denuncia_protocolo_key" ON "Denuncia"("protocolo");

-- CreateIndex
CREATE INDEX "Denuncia_empresaId_status_idx" ON "Denuncia"("empresaId", "status");

-- CreateIndex
CREATE INDEX "MensagemDenuncia_denunciaId_criadoEm_idx" ON "MensagemDenuncia"("denunciaId", "criadoEm");

-- CreateIndex
CREATE INDEX "EtapaDenuncia_denunciaId_idx" ON "EtapaDenuncia"("denunciaId");

-- CreateIndex
CREATE INDEX "LogAuditoriaDenuncia_denunciaId_criadoEm_idx" ON "LogAuditoriaDenuncia"("denunciaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoDenunciaAnonima_token_key" ON "SessaoDenunciaAnonima"("token");

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemDenuncia" ADD CONSTRAINT "MensagemDenuncia_denunciaId_fkey" FOREIGN KEY ("denunciaId") REFERENCES "Denuncia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaDenuncia" ADD CONSTRAINT "EtapaDenuncia_denunciaId_fkey" FOREIGN KEY ("denunciaId") REFERENCES "Denuncia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoriaDenuncia" ADD CONSTRAINT "LogAuditoriaDenuncia_denunciaId_fkey" FOREIGN KEY ("denunciaId") REFERENCES "Denuncia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoDenunciaAnonima" ADD CONSTRAINT "SessaoDenunciaAnonima_denunciaId_fkey" FOREIGN KEY ("denunciaId") REFERENCES "Denuncia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
