-- AlterTable: habilidades procuradas pela empresa numa vaga (pro cálculo de match)
ALTER TABLE "Vaga" ADD COLUMN "habilidadesProcuradas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: candidatura registra se deu match (congelado no momento da candidatura)
ALTER TABLE "Candidatura" ADD COLUMN "match" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "AutorMensagem" AS ENUM ('EMPRESA', 'PESSOA');

-- CreateTable
CREATE TABLE "Conversa" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaLeituraEmpresaEm" TIMESTAMP(3),
    "ultimaLeituraPessoaEm" TIMESTAMP(3),

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" SERIAL NOT NULL,
    "conversaId" INTEGER NOT NULL,
    "autor" "AutorMensagem" NOT NULL,
    "autorEmail" TEXT,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversa_empresaId_pessoaId_key" ON "Conversa"("empresaId", "pessoaId");

-- CreateIndex
CREATE INDEX "Mensagem_conversaId_criadoEm_idx" ON "Mensagem"("conversaId", "criadoEm");

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
