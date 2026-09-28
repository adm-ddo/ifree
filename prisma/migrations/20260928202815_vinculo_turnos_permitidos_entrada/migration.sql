-- AlterEnum
ALTER TYPE "TurnoPredefinido" ADD VALUE 'MADRUGADA';

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "horarioInicioMadrugadaMin" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VinculoPessoaEmpresa" ADD COLUMN     "bloqueadoSuspeitaFraudeEm" TIMESTAMP(3),
ADD COLUMN     "motivoBloqueioSuspeitaFraude" TEXT,
ADD COLUMN     "turnosPermitidosEntrada" "TurnoPredefinido"[] DEFAULT ARRAY[]::"TurnoPredefinido"[];
