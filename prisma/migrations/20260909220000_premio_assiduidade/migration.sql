ALTER TABLE "VinculoPessoaEmpresa"
  ADD COLUMN "recebePremioAssiduidade" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "valorPremioAssiduidade" DECIMAL(10,2);
