-- AlterTable
ALTER TABLE "Pessoa" ADD COLUMN     "cep" TEXT,
ADD COLUMN     "contatoEmergenciaNome" TEXT,
ADD COLUMN     "contatoEmergenciaTelefone" TEXT,
ADD COLUMN     "dataNascimento" DATE,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "rg" TEXT;

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "correcaoFuncaoEm" TIMESTAMP(3),
ADD COLUMN     "correcaoFuncaoPorEmail" TEXT,
ADD COLUMN     "funcaoOriginalNome" TEXT,
ADD COLUMN     "valorHoraOriginalAplicado" DECIMAL(10,2);
