-- AlterEnum
ALTER TYPE "StatusPagamento" ADD VALUE 'CANCELADO';

-- AlterTable: separa o desconto automático de pausa em dia/noite
ALTER TABLE "Empresa" ADD COLUMN "modoPausaDia" "ModoPausa" NOT NULL DEFAULT 'NENHUMA';
ALTER TABLE "Empresa" ADD COLUMN "modoPausaNoite" "ModoPausa" NOT NULL DEFAULT 'NENHUMA';

-- Backfill: toda empresa que já tinha configurado um modoPausa único
-- continua com o mesmo comportamento em ambos os turnos até o dono ajustar
-- manualmente em /configuracoes — ninguém perde a configuração existente.
UPDATE "Empresa" SET "modoPausaDia" = "modoPausa", "modoPausaNoite" = "modoPausa";

ALTER TABLE "Empresa" DROP COLUMN "modoPausa";
