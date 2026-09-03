-- CreateTable
CREATE TABLE "RestricaoHorarioDia" (
    "id" SERIAL NOT NULL,
    "vinculoId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaMinimaMin" INTEGER,
    "horaMaximaMin" INTEGER,

    CONSTRAINT "RestricaoHorarioDia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestricaoHorarioDia_vinculoId_diaSemana_key" ON "RestricaoHorarioDia"("vinculoId", "diaSemana");

-- AddForeignKey
ALTER TABLE "RestricaoHorarioDia" ADD CONSTRAINT "RestricaoHorarioDia_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "VinculoPessoaEmpresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
