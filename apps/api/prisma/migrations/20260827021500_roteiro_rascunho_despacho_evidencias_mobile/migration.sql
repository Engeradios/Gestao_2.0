-- Roteiro de Entrega: rascunho sem recursos, despacho controlado e evidencias mobile
-- Migration somente aditiva, sem exclusao de dados.

ALTER TABLE "op_roteiro_entrega_cabecalhos"
  ALTER COLUMN "entregador_id" DROP NOT NULL,
  ALTER COLUMN "veiculo_id" DROP NOT NULL,
  ADD COLUMN "titulo" VARCHAR(160),
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "pronto_em" TIMESTAMP(6),
  ADD COLUMN "pronto_por" VARCHAR(160),
  ADD COLUMN "reaberto_em" TIMESTAMP(6),
  ADD COLUMN "reaberto_por" VARCHAR(160),
  ADD COLUMN "motivo_reabertura" TEXT;

ALTER TABLE "op_roteiro_entrega_cabecalhos"
  DROP CONSTRAINT IF EXISTS "op_roteiro_entrega_cabecalhos_status_check";
ALTER TABLE "op_roteiro_entrega_cabecalhos"
  ADD CONSTRAINT "op_roteiro_entrega_cabecalhos_status_check"
  CHECK ("status" IN ('RASCUNHO','EM_PLANEJAMENTO','PRONTO_PARA_DESPACHO','DESPACHADO','EM_ROTA','FINALIZADO','FINALIZADO_COM_PENDENCIAS','CANCELADO'));
ALTER TABLE "op_roteiro_entrega_cabecalhos"
  ADD CONSTRAINT "op_roteiro_entrega_cabecalhos_versao_check" CHECK ("versao" > 0);
ALTER TABLE "op_roteiro_entrega_cabecalhos"
  ADD CONSTRAINT "op_roteiro_entrega_cabecalhos_despacho_recursos_check"
  CHECK ("status" NOT IN ('PRONTO_PARA_DESPACHO','DESPACHADO','EM_ROTA','FINALIZADO','FINALIZADO_COM_PENDENCIAS') OR ("entregador_id" IS NOT NULL AND "veiculo_id" IS NOT NULL));

DROP INDEX IF EXISTS "op_roteiro_entrega_cabecalhos_rota_uq";
CREATE UNIQUE INDEX "op_roteiro_entrega_cabecalhos_rota_recursos_uq"
  ON "op_roteiro_entrega_cabecalhos"("data_rota","entregador_id","veiculo_id")
  WHERE "entregador_id" IS NOT NULL AND "veiculo_id" IS NOT NULL AND "status" <> 'CANCELADO';
CREATE INDEX "op_roteiro_entrega_cabecalhos_planejamento_idx"
  ON "op_roteiro_entrega_cabecalhos"("status","data_rota","atualizado_em" DESC);

CREATE TABLE "op_roteiro_entrega_evidencias" (
  "id" BIGSERIAL PRIMARY KEY,
  "entrega_id" BIGINT NOT NULL,
  "tipo" VARCHAR(30) NOT NULL,
  "status_entrega" VARCHAR(40),
  "arquivo_uuid" UUID,
  "nome_original" VARCHAR(255),
  "mime_type" VARCHAR(120),
  "tamanho_bytes" BIGINT,
  "hash_sha256" CHAR(64),
  "recebedor_nome" VARCHAR(160),
  "recebedor_documento" VARCHAR(40),
  "observacao" TEXT,
  "motivo_ocorrencia" VARCHAR(160),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "capturado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enviado_em" TIMESTAMP(6),
  "origem_evento" VARCHAR(20) NOT NULL DEFAULT 'APP',
  "evento_id" VARCHAR(120),
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(160),
  "metadados" JSONB,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "op_roteiro_entrega_evidencias_entrega_fkey" FOREIGN KEY ("entrega_id") REFERENCES "op_roteiro_entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_entrega_evidencias_tipo_check" CHECK ("tipo" IN ('FOTO','ASSINATURA','COMPROVANTE','OCORRENCIA','DEVOLUCAO')),
  CONSTRAINT "op_roteiro_entrega_evidencias_origem_check" CHECK ("origem_evento" IN ('WEB','APP','SISTEMA')),
  CONSTRAINT "op_roteiro_entrega_evidencias_tamanho_check" CHECK ("tamanho_bytes" IS NULL OR "tamanho_bytes" >= 0),
  CONSTRAINT "op_roteiro_entrega_evidencias_coordenadas_check" CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180))
);
CREATE UNIQUE INDEX "op_roteiro_entrega_evidencias_evento_uq" ON "op_roteiro_entrega_evidencias"("evento_id") WHERE "evento_id" IS NOT NULL;
CREATE INDEX "op_roteiro_entrega_evidencias_entrega_data_idx" ON "op_roteiro_entrega_evidencias"("entrega_id","capturado_em" DESC);
CREATE INDEX "op_roteiro_entrega_evidencias_tipo_idx" ON "op_roteiro_entrega_evidencias"("tipo");
CREATE UNIQUE INDEX "op_roteiro_entrega_evidencias_arquivo_uuid_uq" ON "op_roteiro_entrega_evidencias"("arquivo_uuid") WHERE "arquivo_uuid" IS NOT NULL;
