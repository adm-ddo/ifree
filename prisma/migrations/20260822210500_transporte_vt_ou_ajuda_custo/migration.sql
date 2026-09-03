-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa"
  ADD COLUMN     "recebeTransporte" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "valorTransporte" DECIMAL(10,2),
  ADD COLUMN     "transporteComDesconto" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "VinculoPessoaEmpresa"
  DROP COLUMN     "recebeAjudaCustoTransporte",
  DROP COLUMN     "valorAjudaCustoTransporte";
