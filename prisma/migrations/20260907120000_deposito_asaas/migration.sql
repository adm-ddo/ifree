-- Depósito PIX da empresa pra dentro da própria subconta Asaas (crédito
-- usado pra pagar os extras).

ALTER TABLE "ContaAsaasEmpresa" ADD COLUMN "clienteProprioId" TEXT;

CREATE TYPE "StatusDepositoAsaas" AS ENUM ('PENDENTE', 'RECEBIDO', 'EXPIRADO');

CREATE TABLE "DepositoAsaas" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "idCobrancaExterna" TEXT NOT NULL,
    "qrCode" TEXT,
    "qrCodeImagemUrl" TEXT,
    "status" "StatusDepositoAsaas" NOT NULL DEFAULT 'PENDENTE',
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "recebidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositoAsaas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepositoAsaas_idCobrancaExterna_key" ON "DepositoAsaas"("idCobrancaExterna");
CREATE INDEX "DepositoAsaas_empresaId_status_idx" ON "DepositoAsaas"("empresaId", "status");

ALTER TABLE "DepositoAsaas" ADD CONSTRAINT "DepositoAsaas_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
