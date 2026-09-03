-- CreateEnum
CREATE TYPE "TurnoPredefinido" AS ENUM ('MANHA', 'NOITE', 'LIVRE');

-- AlterTable Empresa: troca horarioFechamentoMin por dois horários,
-- preservando o valor já configurado por cada empresa como o corte da
-- noite (comportamento antigo era um único corte final do dia).
ALTER TABLE "Empresa"
  ADD COLUMN     "horarioFechamentoDiaMin" INTEGER NOT NULL DEFAULT 1020,
  ADD COLUMN     "horarioFechamentoNoiteMin" INTEGER NOT NULL DEFAULT 1410;

UPDATE "Empresa" SET "horarioFechamentoNoiteMin" = "horarioFechamentoMin";

ALTER TABLE "Empresa" DROP COLUMN "horarioFechamentoMin";

-- AlterTable VinculoPessoaEmpresa
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "turnoPredefinido" "TurnoPredefinido" NOT NULL DEFAULT 'LIVRE';

-- AlterTable Turno
ALTER TABLE "Turno" ADD COLUMN     "turnoDobrado" BOOLEAN NOT NULL DEFAULT false;
