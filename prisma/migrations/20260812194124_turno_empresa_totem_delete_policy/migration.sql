-- DropForeignKey
ALTER TABLE "Turno" DROP CONSTRAINT "Turno_empresaId_fkey";

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
