CREATE TABLE "op_roteiro_entrega_cabecalhos" (
  "id" BIGSERIAL PRIMARY KEY,
  "data_rota" DATE NOT NULL,
  "entregador_id" BIGINT NOT NULL,
  "veiculo_id" BIGINT NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
  "observacoes" TEXT,
  "criado_por" VARCHAR(160),
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "despachado_em" TIMESTAMP(6),
  "despachado_por" VARCHAR(160),
  "finalizado_em" TIMESTAMP(6),
  CONSTRAINT "op_roteiro_entrega_cabecalhos_entregador_id_fkey"
    FOREIGN KEY ("entregador_id") REFERENCES "op_entregadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_entrega_cabecalhos_veiculo_id_fkey"
    FOREIGN KEY ("veiculo_id") REFERENCES "op_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_entrega_cabecalhos_status_check"
    CHECK ("status" IN ('RASCUNHO','DESPACHADO','EM_ROTA','FINALIZADO','CANCELADO'))
);

CREATE INDEX "op_roteiro_entrega_cabecalhos_data_rota_idx" ON "op_roteiro_entrega_cabecalhos"("data_rota");
CREATE INDEX "op_roteiro_entrega_cabecalhos_status_idx" ON "op_roteiro_entrega_cabecalhos"("status");
CREATE INDEX "op_roteiro_entrega_cabecalhos_entregador_id_idx" ON "op_roteiro_entrega_cabecalhos"("entregador_id");
CREATE INDEX "op_roteiro_entrega_cabecalhos_veiculo_id_idx" ON "op_roteiro_entrega_cabecalhos"("veiculo_id");
CREATE UNIQUE INDEX "op_roteiro_entrega_cabecalhos_rota_uq"
  ON "op_roteiro_entrega_cabecalhos"("data_rota", "entregador_id", "veiculo_id");

ALTER TABLE "op_roteiro_entregas" ADD COLUMN "roteiro_id" BIGINT;
ALTER TABLE "op_roteiro_entregas" ADD CONSTRAINT "op_roteiro_entregas_roteiro_id_fkey"
  FOREIGN KEY ("roteiro_id") REFERENCES "op_roteiro_entrega_cabecalhos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "op_roteiro_entregas_roteiro_id_idx" ON "op_roteiro_entregas"("roteiro_id");
