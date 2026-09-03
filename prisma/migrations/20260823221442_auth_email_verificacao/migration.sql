-- CreateEnum
CREATE TYPE "TipoTokenAutenticacao" AS ENUM ('VERIFICACAO_EMAIL', 'RECUPERACAO_SENHA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "emailVerificadoEm" TIMESTAMP(3);

-- Backfill: contas criadas antes deste campo existir são tratadas como
-- já verificadas (usam a própria data de criação) — sem isso, TODO
-- usuário e empresa já cadastrados (inclusive a conta master) ficariam
-- bloqueados no próximo login, já que login passa a exigir
-- emailVerificadoEm != null.
UPDATE "Usuario" SET "emailVerificadoEm" = "criadoEm" WHERE "emailVerificadoEm" IS NULL;

-- CreateTable
CREATE TABLE "TokenAutenticacao" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoTokenAutenticacao" NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAutenticacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenAutenticacao_token_key" ON "TokenAutenticacao"("token");

-- CreateIndex
CREATE INDEX "TokenAutenticacao_usuarioId_tipo_idx" ON "TokenAutenticacao"("usuarioId", "tipo");

-- AddForeignKey
ALTER TABLE "TokenAutenticacao" ADD CONSTRAINT "TokenAutenticacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
