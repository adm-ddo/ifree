CREATE TABLE "TentativaConfirmacaoIdentidade" (
  "id" SERIAL PRIMARY KEY,
  "pessoaId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TentativaConfirmacaoIdentidade_pessoaId_empresaId_key" UNIQUE ("pessoaId", "empresaId"),
  CONSTRAINT "TentativaConfirmacaoIdentidade_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE,
  CONSTRAINT "TentativaConfirmacaoIdentidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE
);
