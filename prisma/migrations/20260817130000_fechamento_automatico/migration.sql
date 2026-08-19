-- Empresa: horário de fechamento usado pelo cron de encerramento automático
ALTER TABLE "Empresa" ADD COLUMN "horarioFechamentoMin" INTEGER NOT NULL DEFAULT 1410;

-- Turno: sinaliza que o encerramento foi automático (sem foto/assinatura de saída)
ALTER TABLE "Turno" ADD COLUMN "fechamentoAutomatico" BOOLEAN NOT NULL DEFAULT false;
