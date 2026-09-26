-- CreateEnum
CREATE TYPE "PlanoEmpresa" AS ENUM ('CONECTA', 'COMPLETO');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "planoCompletoDesde" TIMESTAMP(3),
ADD COLUMN     "planoEmpresa" "PlanoEmpresa" NOT NULL DEFAULT 'COMPLETO';

-- DataMigration: congela o preço de toda empresa que já existia antes
-- deste campo, pra valorMensalidadeEfetivo (src/lib/assinatura.ts) nunca
-- recalcular um preço diferente do que ela já paga hoje.
UPDATE "Empresa" SET "valorMensalidade" = COALESCE("valorMensalidade", 99.90) WHERE "valorMensalidade" IS NULL;
