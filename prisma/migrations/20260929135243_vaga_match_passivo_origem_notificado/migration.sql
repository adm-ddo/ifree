-- CreateEnum
CREATE TYPE "OrigemMatchPassivo" AS ENUM ('VAGA_NOVA', 'PERFIL_ATUALIZADO');

-- AlterTable
ALTER TABLE "VagaMatchPassivo" ADD COLUMN     "notificadoEm" TIMESTAMP(3),
ADD COLUMN     "origem" "OrigemMatchPassivo" NOT NULL DEFAULT 'VAGA_NOVA';

-- CreateIndex
CREATE INDEX "VagaMatchPassivo_origem_notificadoEm_idx" ON "VagaMatchPassivo"("origem", "notificadoEm");

-- Backfill: toda linha que já existia antes desta migração já teve seu
-- e-mail mandado pelo código antigo (síncrono, na hora da criação) — sem
-- isso, o cron novo (/api/cron/enviar-notificacoes-pendentes) trataria
-- meses de matches antigos como pendentes e reenviaria e-mail pra gente
-- que já foi avisada há muito tempo.
UPDATE "VagaMatchPassivo" SET "notificadoEm" = "criadoEm" WHERE "notificadoEm" IS NULL;
