-- Gênero informado no cadastro do Portal (iFREE Conecta) — usado pra
-- colorir o avatar padrão (azul/rosa/cinza) enquanto a pessoa não tem
-- fotoUrl. Opcional: null pra quem nunca passou pelo cadastro do Conecta.

CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO', 'PREFIRO_NAO_DIZER');

ALTER TABLE "Pessoa" ADD COLUMN "sexo" "Sexo";
