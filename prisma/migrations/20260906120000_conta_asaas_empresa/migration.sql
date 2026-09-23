-- Estrutura pra futura automação do PIX dos extras via Asaas (subconta por
-- empresa cliente) — ainda sem nenhum código usando isso de verdade, só a
-- base de dados pronta pra quando tivermos a conta-mãe/credenciais.

CREATE TYPE "StatusContaAsaas" AS ENUM ('PENDENTE_ATIVACAO', 'ATIVA', 'BLOQUEADA');

CREATE TABLE "ContaAsaasEmpresa" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "walletId" TEXT,
    "apiKeyCriptografada" TEXT NOT NULL,
    "status" "StatusContaAsaas" NOT NULL DEFAULT 'PENDENTE_ATIVACAO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaAsaasEmpresa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContaAsaasEmpresa_empresaId_key" ON "ContaAsaasEmpresa"("empresaId");
CREATE UNIQUE INDEX "ContaAsaasEmpresa_accountId_key" ON "ContaAsaasEmpresa"("accountId");

ALTER TABLE "ContaAsaasEmpresa" ADD CONSTRAINT "ContaAsaasEmpresa_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
