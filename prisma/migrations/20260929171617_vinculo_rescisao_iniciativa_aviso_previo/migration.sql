-- CreateEnum
CREATE TYPE "IniciativaRescisao" AS ENUM ('FUNCIONARIO', 'EMPRESA');

-- CreateEnum
CREATE TYPE "TipoAvisoPrevioRescisao" AS ENUM ('FUNCIONARIO_CUMPRE', 'FUNCIONARIO_DISPENSADO', 'EMPRESA_SAIDA_2H', 'EMPRESA_SETE_DIAS', 'EMPRESA_INDENIZADO');

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "rescisaoAvisoPrevio" "TipoAvisoPrevioRescisao",
ADD COLUMN     "rescisaoDataPedido" DATE,
ADD COLUMN     "rescisaoDocumentosAssinadosEm" TIMESTAMP(3),
ADD COLUMN     "rescisaoIniciativa" "IniciativaRescisao";
