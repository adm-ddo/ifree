-- CreateEnum
CREATE TYPE "CanceladoPor" AS ENUM ('EMPRESA', 'PESSOA');

-- AlterTable
ALTER TABLE "ExtraMarcado" ADD COLUMN     "canceladoPor" "CanceladoPor";
