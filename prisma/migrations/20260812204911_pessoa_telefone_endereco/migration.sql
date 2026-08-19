/*
  Warnings:

  - Added the required column `endereco` to the `Pessoa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefone` to the `Pessoa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Pessoa" ADD COLUMN     "endereco" TEXT NOT NULL,
ADD COLUMN     "telefone" TEXT NOT NULL;
