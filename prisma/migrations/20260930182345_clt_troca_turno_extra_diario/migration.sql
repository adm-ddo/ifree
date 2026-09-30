-- AlterTable
ALTER TABLE "RegistroPonto" ADD COLUMN     "trocaTurnoOficialHoje" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "origemExtraDiarioClt" BOOLEAN NOT NULL DEFAULT false;
