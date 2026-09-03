-- AlterTable: acesso ao Portal (iFREE Conecta) — null até a pessoa configurar
ALTER TABLE "Pessoa" ADD COLUMN "senhaHash" TEXT;

-- CreateTable
CREATE TABLE "SessaoPessoa" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoPessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAutenticacaoPessoa" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "tipo" "TipoTokenAutenticacao" NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAutenticacaoPessoa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessaoPessoa_token_key" ON "SessaoPessoa"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAutenticacaoPessoa_token_key" ON "TokenAutenticacaoPessoa"("token");

-- CreateIndex
CREATE INDEX "TokenAutenticacaoPessoa_pessoaId_tipo_idx" ON "TokenAutenticacaoPessoa"("pessoaId", "tipo");

-- AddForeignKey
ALTER TABLE "SessaoPessoa" ADD CONSTRAINT "SessaoPessoa_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAutenticacaoPessoa" ADD CONSTRAINT "TokenAutenticacaoPessoa_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
