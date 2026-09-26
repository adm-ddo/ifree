-- CreateEnum
CREATE TYPE "TurnoExtraMarcado" AS ENUM ('DIA', 'NOITE');

-- CreateEnum
CREATE TYPE "StatusExtraMarcado" AS ENUM ('AGUARDANDO_PESSOA', 'CONFIRMADO', 'CUMPRIDO', 'NAO_COMPARECEU', 'CANCELADO');

-- CreateTable
CREATE TABLE "ExtraMarcado" (
    "id" SERIAL NOT NULL,
    "candidaturaId" INTEGER NOT NULL,
    "vagaId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "turnoTipo" "TurnoExtraMarcado" NOT NULL,
    "confirmadoEmpresaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoPessoaEm" TIMESTAMP(3),
    "status" "StatusExtraMarcado" NOT NULL DEFAULT 'AGUARDANDO_PESSOA',
    "turnoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraMarcado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtraMarcado_turnoId_key" ON "ExtraMarcado"("turnoId");

-- CreateIndex
CREATE INDEX "ExtraMarcado_candidaturaId_idx" ON "ExtraMarcado"("candidaturaId");

-- CreateIndex
CREATE INDEX "ExtraMarcado_pessoaId_idx" ON "ExtraMarcado"("pessoaId");

-- CreateIndex
CREATE INDEX "ExtraMarcado_status_data_idx" ON "ExtraMarcado"("status", "data");

-- AddForeignKey
ALTER TABLE "ExtraMarcado" ADD CONSTRAINT "ExtraMarcado_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "Candidatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraMarcado" ADD CONSTRAINT "ExtraMarcado_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraMarcado" ADD CONSTRAINT "ExtraMarcado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraMarcado" ADD CONSTRAINT "ExtraMarcado_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraMarcado" ADD CONSTRAINT "ExtraMarcado_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
