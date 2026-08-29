ALTER TABLE "op_preventivas"
  ADD COLUMN "legado_id" INTEGER,
  ADD COLUMN "cliente_id_legado" INTEGER,
  ADD COLUMN "cliente_codigo" VARCHAR(40),
  ADD COLUMN "local_instalacao" VARCHAR(255),
  ADD COLUMN "uf" CHAR(2),
  ADD COLUMN "data_realizada" DATE;

CREATE UNIQUE INDEX "op_preventivas_legado_id_key"
  ON "op_preventivas"("legado_id");
CREATE INDEX "op_preventivas_cliente_codigo_idx"
  ON "op_preventivas"("cliente_codigo");
