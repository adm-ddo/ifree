-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "dataAdmissao" DATE,
ADD COLUMN     "recebeAjudaCustoTransporte" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recebeBonificacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recebeInsalubridade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recebePericulosidade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimasFeriasGozadasEm" DATE,
ADD COLUMN     "valorAjudaCustoTransporte" DECIMAL(10,2),
ADD COLUMN     "valorBonificacao" DECIMAL(10,2),
ADD COLUMN     "valorInsalubridade" DECIMAL(10,2),
ADD COLUMN     "valorPericulosidade" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "HistoricoSalarial" (
    "id" SERIAL NOT NULL,
    "vinculoId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "vigenteDesde" DATE NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoSalarial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoSalarial_vinculoId_idx" ON "HistoricoSalarial"("vinculoId");

-- AddForeignKey
ALTER TABLE "HistoricoSalarial" ADD CONSTRAINT "HistoricoSalarial_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "VinculoPessoaEmpresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
