-- CreateEnum
CREATE TYPE "FrequenciaPagamento" AS ENUM ('DIARIA', 'SEMANAL');

-- Empresa: configuração da semana de pagamento
ALTER TABLE "Empresa" ADD COLUMN "semanaPagamentoInicioDia" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Empresa" ADD COLUMN "semanaPagamentoDia" INTEGER NOT NULL DEFAULT 3;

-- VinculoPessoaEmpresa: frequência configurada pelo dono
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN "frequenciaPagamento" "FrequenciaPagamento" NOT NULL DEFAULT 'DIARIA';

-- Turno: snapshot da frequência no check-in
ALTER TABLE "Turno" ADD COLUMN "frequenciaPagamentoAplicada" "FrequenciaPagamento" NOT NULL DEFAULT 'DIARIA';
