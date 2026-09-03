-- AlterTable
ALTER TABLE "Pessoa" ADD COLUMN "indicadoPorPessoaId" INTEGER;
ALTER TABLE "Pessoa" ADD COLUMN "indicadoPorNomeTexto" TEXT;

-- AddForeignKey
ALTER TABLE "Pessoa" ADD CONSTRAINT "Pessoa_indicadoPorPessoaId_fkey" FOREIGN KEY ("indicadoPorPessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
