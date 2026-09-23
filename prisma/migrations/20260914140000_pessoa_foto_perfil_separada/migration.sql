-- Pessoa.fotoUrl estava sendo usada pra DOIS propósitos diferentes: a
-- foto mais recente do check-in no totem (sobrescrita a cada turno) e a
-- foto de perfil escolhida no Portal (iFREE Conecta). Como o totem roda
-- muito mais vezes que o cadastro do Conecta, a foto do totem acabava
-- sobrescrevendo a do Conecta na prática — e pior, aparecia como avatar
-- de gente que nunca nem passou pelo Portal. Separando em duas colunas:
-- fotoUrl continua só como referência interna (conferência de identidade
-- no painel master), fotoPerfilUrl é a única fonte válida pra avatar/
-- Conecta daqui pra frente.

ALTER TABLE "Pessoa" ADD COLUMN "fotoPerfilUrl" TEXT;

-- Backfill: só migra quem ainda tem em fotoUrl uma foto que veio do
-- próprio fluxo do Portal (padrão de nome de arquivo "pessoas/foto-
-- perfil...") e que portanto nunca foi sobrescrita por um check-in de
-- totem depois — nesses casos, preservamos a foto de perfil real da
-- pessoa. Nos demais, fotoPerfilUrl fica null (o avatar cai no
-- bonequinho colorido até a pessoa enviar uma foto de verdade pelo
-- Portal).
UPDATE "Pessoa"
SET "fotoPerfilUrl" = "fotoUrl"
WHERE "fotoUrl" LIKE '%/pessoas/foto-perfil%';
