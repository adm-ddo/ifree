-- AlterTable
ALTER TABLE "UsuarioEmpresa" ADD COLUMN     "modulosPermitidos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ConviteEquipe" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "criadoPorId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "modulosPermitidos" TEXT[],
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "usadoPorId" INTEGER,
    "revogadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteEquipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteEquipe_token_key" ON "ConviteEquipe"("token");

-- CreateIndex
CREATE INDEX "ConviteEquipe_empresaId_idx" ON "ConviteEquipe"("empresaId");

-- AddForeignKey
ALTER TABLE "ConviteEquipe" ADD CONSTRAINT "ConviteEquipe_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteEquipe" ADD CONSTRAINT "ConviteEquipe_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteEquipe" ADD CONSTRAINT "ConviteEquipe_usadoPorId_fkey" FOREIGN KEY ("usadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
