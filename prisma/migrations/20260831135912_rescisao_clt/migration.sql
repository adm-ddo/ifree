-- AlterTable: rescisão do vínculo CLT (não efetivar no período de
-- experiência, ou rescisão comum) — ver VinculoPessoaEmpresa.dataRescisao
-- no schema pro contexto completo.
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN "dataRescisao" DATE;
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN "rescisaoRegistradaEm" TIMESTAMP(3);
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN "rescisaoRegistradaPorEmail" TEXT;
