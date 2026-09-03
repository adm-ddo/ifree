-- AlterTable: perfil profissional + aceite de termos do Portal (iFREE Conecta)
ALTER TABLE "Pessoa" ADD COLUMN "biografia" TEXT;
ALTER TABLE "Pessoa" ADD COLUMN "habilidades" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Pessoa" ADD COLUMN "vagasDesejadas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Pessoa" ADD COLUMN "termosAceitosEm" TIMESTAMP(3);
