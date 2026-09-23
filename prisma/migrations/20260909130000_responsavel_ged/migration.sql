ALTER TABLE "UsuarioEmpresa" ADD COLUMN "responsavelGed" BOOLEAN NOT NULL DEFAULT false;
UPDATE "UsuarioEmpresa" SET "responsavelGed" = true;
