-- CreateEnum
CREATE TYPE "AutorAvaliacao" AS ENUM ('EXTRA', 'EMPRESA');

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "autor" "AutorAvaliacao" NOT NULL,
    "nota" INTEGER NOT NULL,
    "tags" TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_turnoId_autor_key" ON "Avaliacao"("turnoId", "autor");

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
