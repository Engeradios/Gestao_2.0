ALTER TABLE "app_campo_termos" ADD COLUMN "conteudo" TEXT NOT NULL;
CREATE UNIQUE INDEX "app_campo_expedientes_usuario_aberto_uq"
ON "app_campo_expedientes" ("usuario_id")
WHERE "status" IN ('ATIVO','PAUSADO');
CREATE UNIQUE INDEX "app_campo_termos_vigente_uq"
ON "app_campo_termos" ((1))
WHERE "vigente" = TRUE;
