ALTER TABLE "op_roteiro_entregas"
  ADD COLUMN "entrega_original_id" BIGINT,
  ADD COLUMN "tentativa_numero" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "motivo_insucesso" VARCHAR(120),
  ADD COLUMN "origem_evento" VARCHAR(20) NOT NULL DEFAULT 'WEB',
  ADD COLUMN "evento_id" VARCHAR(120),
  ADD COLUMN "confirmado_em" TIMESTAMP(6),
  ADD COLUMN "confirmado_por" VARCHAR(160);

ALTER TABLE "op_roteiro_entregas" ADD CONSTRAINT "op_roteiro_entregas_entrega_original_id_fkey"
  FOREIGN KEY ("entrega_original_id") REFERENCES "op_roteiro_entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "op_roteiro_entregas" ADD CONSTRAINT "op_roteiro_entregas_tentativa_numero_check" CHECK ("tentativa_numero" > 0);
ALTER TABLE "op_roteiro_entregas" ADD CONSTRAINT "op_roteiro_entregas_origem_evento_check" CHECK ("origem_evento" IN ('WEB','APP','SISTEMA'));
CREATE UNIQUE INDEX "op_roteiro_entregas_evento_id_uq" ON "op_roteiro_entregas"("evento_id") WHERE "evento_id" IS NOT NULL;
CREATE INDEX "op_roteiro_entregas_entrega_original_id_idx" ON "op_roteiro_entregas"("entrega_original_id");

CREATE TABLE "op_roteiro_entrega_historicos" (
  "id" BIGSERIAL PRIMARY KEY,
  "entrega_id" BIGINT NOT NULL,
  "status_anterior" VARCHAR(40),
  "status_novo" VARCHAR(40) NOT NULL,
  "observacao" TEXT,
  "motivo" VARCHAR(120),
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(160),
  "origem_evento" VARCHAR(20) NOT NULL DEFAULT 'WEB',
  "evento_id" VARCHAR(120),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "registrado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "op_roteiro_entrega_historicos_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "op_roteiro_entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_entrega_historicos_origem_evento_check" CHECK ("origem_evento" IN ('WEB','APP','SISTEMA'))
);
CREATE UNIQUE INDEX "op_roteiro_entrega_historicos_evento_id_uq" ON "op_roteiro_entrega_historicos"("evento_id") WHERE "evento_id" IS NOT NULL;
CREATE INDEX "op_roteiro_entrega_historicos_entrega_registrado_idx" ON "op_roteiro_entrega_historicos"("entrega_id", "registrado_em");
CREATE INDEX "op_roteiro_entrega_historicos_status_novo_idx" ON "op_roteiro_entrega_historicos"("status_novo");
