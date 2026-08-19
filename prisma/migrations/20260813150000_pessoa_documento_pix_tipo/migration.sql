-- CreateEnum
CREATE TYPE "TipoDocumentoPessoa" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE');

-- Rename Pessoa.cpf -> Pessoa.documento (mesma coluna, novo nome: agora pode
-- guardar CPF ou CNPJ) e o índice único junto
ALTER TABLE "Pessoa" RENAME COLUMN "cpf" TO "documento";
ALTER INDEX "Pessoa_cpf_key" RENAME TO "Pessoa_documento_key";

-- AlterTable
ALTER TABLE "Pessoa" ADD COLUMN "tipoDocumento" "TipoDocumentoPessoa" NOT NULL DEFAULT 'CPF';
ALTER TABLE "Pessoa" ADD COLUMN "tipoChavePix" "TipoChavePix" NOT NULL DEFAULT 'CPF';

-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN "tipoChavePixDestino" "TipoChavePix" NOT NULL DEFAULT 'CPF';
