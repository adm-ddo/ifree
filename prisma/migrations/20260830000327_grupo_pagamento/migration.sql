-- CreateTable: vários turnos da mesma pessoa pagos juntos numa única
-- transferência PIX (ver GrupoPagamento no schema pro contexto completo).
CREATE TABLE "GrupoPagamento" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "criadoPorEmail" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrupoPagamento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrupoPagamento_empresaId_idx" ON "GrupoPagamento"("empresaId");
CREATE INDEX "GrupoPagamento_pessoaId_idx" ON "GrupoPagamento"("pessoaId");

ALTER TABLE "GrupoPagamento" ADD CONSTRAINT "GrupoPagamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoPagamento" ADD CONSTRAINT "GrupoPagamento_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: liga cada Pagamento ao grupo em que foi confirmado (null = pago avulso, como sempre foi)
ALTER TABLE "Pagamento" ADD COLUMN "grupoPagamentoId" INTEGER;

CREATE INDEX "Pagamento_grupoPagamentoId_idx" ON "Pagamento"("grupoPagamentoId");

ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_grupoPagamentoId_fkey" FOREIGN KEY ("grupoPagamentoId") REFERENCES "GrupoPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
