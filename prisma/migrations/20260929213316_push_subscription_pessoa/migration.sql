-- AlterTable
ALTER TABLE "Conversa" ADD COLUMN     "ultimaChamadaAtencaoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PushSubscriptionPessoa" (
    "id" SERIAL NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "chaveP256dh" TEXT NOT NULL,
    "chaveAuth" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscriptionPessoa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscriptionPessoa_endpoint_key" ON "PushSubscriptionPessoa"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscriptionPessoa_pessoaId_idx" ON "PushSubscriptionPessoa"("pessoaId");

-- AddForeignKey
ALTER TABLE "PushSubscriptionPessoa" ADD CONSTRAINT "PushSubscriptionPessoa_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
