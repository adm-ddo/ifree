-- CONCURRENTLY de propósito (tabelas de produção com dados reais) — cada
-- comando roda fora de transação, aplicado manualmente um de cada vez via
-- `prisma db execute` (não dá pra rodar CONCURRENTLY dentro de uma
-- transação, e alguns runners agrupam o arquivo inteiro numa só).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Vaga_empresaId_idx" ON "Vaga"("empresaId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Turno_empresaId_criadoEm_idx" ON "Turno"("empresaId", "criadoEm");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Turno_empresaId_horaEntrada_idx" ON "Turno"("empresaId", "horaEntrada");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RegistroPonto_empresaId_horaEntrada_idx" ON "RegistroPonto"("empresaId", "horaEntrada");
