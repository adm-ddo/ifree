-- Separa o desconto automático de intervalo dos funcionários CLT do
-- desconto usado pros EXTRAS (modoPausaDia/modoPausaNoite), com padrão de
-- 1h (AUTOMATICA_60) pros dois turnos — cobre a exigência de intervalo
-- intrajornada da CLT (art. 71) mesmo quando a empresa não exige bater
-- intervalo real no totem.
ALTER TABLE "Empresa" ADD COLUMN "modoPausaCltDia" "ModoPausa" NOT NULL DEFAULT 'AUTOMATICA_60';
ALTER TABLE "Empresa" ADD COLUMN "modoPausaCltNoite" "ModoPausa" NOT NULL DEFAULT 'AUTOMATICA_60';
