-- DropForeignKey
ALTER TABLE "TentativaConfirmacaoIdentidade" DROP CONSTRAINT "TentativaConfirmacaoIdentidade_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "TentativaConfirmacaoIdentidade" DROP CONSTRAINT "TentativaConfirmacaoIdentidade_pessoaId_fkey";

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "modoPausaOverride" "ModoPausa";

-- AddForeignKey
ALTER TABLE "TentativaConfirmacaoIdentidade" ADD CONSTRAINT "TentativaConfirmacaoIdentidade_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativaConfirmacaoIdentidade" ADD CONSTRAINT "TentativaConfirmacaoIdentidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
