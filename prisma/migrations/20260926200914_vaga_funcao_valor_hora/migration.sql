-- AlterTable
ALTER TABLE "Vaga" ADD COLUMN     "funcaoId" INTEGER,
ADD COLUMN     "valorHora" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "Vaga" ADD CONSTRAINT "Vaga_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Funcao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
