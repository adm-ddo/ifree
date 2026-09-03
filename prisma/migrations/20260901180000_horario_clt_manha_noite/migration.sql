-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "horarioEntrada5x2NoiteMin" INTEGER;
ALTER TABLE "Empresa" ADD COLUMN "horarioSaida5x2NoiteMin" INTEGER;
ALTER TABLE "Empresa" ADD COLUMN "horarioEntrada6x1NoiteMin" INTEGER;
ALTER TABLE "Empresa" ADD COLUMN "horarioSaida6x1NoiteMin" INTEGER;
ALTER TABLE "Empresa" ADD COLUMN "horarioEntrada12x36NoiteMin" INTEGER;
ALTER TABLE "Empresa" ADD COLUMN "horarioSaida12x36NoiteMin" INTEGER;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN "escalaTurno" "TurnoPredefinido";
