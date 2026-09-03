-- AlterTable
ALTER TABLE "Empresa"
  ADD COLUMN "horarioEntrada5x2Min" INTEGER,
  ADD COLUMN "horarioSaida5x2Min" INTEGER,
  ADD COLUMN "horarioEntrada6x1Min" INTEGER,
  ADD COLUMN "horarioSaida6x1Min" INTEGER,
  ADD COLUMN "horarioEntrada12x36Min" INTEGER,
  ADD COLUMN "horarioSaida12x36Min" INTEGER;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa"
  ADD COLUMN "horarioEntradaMin" INTEGER,
  ADD COLUMN "horarioSaidaMin" INTEGER;
