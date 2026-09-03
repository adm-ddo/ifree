-- AlterTable
ALTER TABLE "Pessoa"
  ADD COLUMN "ctpsNumero" TEXT,
  ADD COLUMN "ctpsSerieUf" TEXT;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa"
  ADD COLUMN "cargo" TEXT;
