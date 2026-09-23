-- AlterTable
ALTER TABLE "CobrancaMensalidade" ADD COLUMN     "valorTablet" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "tabletFornecido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tabletParcelasPagas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tabletParcelasTotal" INTEGER,
ADD COLUMN     "tabletValorTotal" DECIMAL(10,2);
