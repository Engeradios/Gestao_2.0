ALTER TABLE "op_proposta_evolucoes" ADD COLUMN IF NOT EXISTS "importacao_id" BIGINT;
CREATE INDEX IF NOT EXISTS "op_proposta_evolucoes_importacao_idx" ON "op_proposta_evolucoes"("importacao_id", "registrado_em" DESC);
DO $$ BEGIN
  ALTER TABLE "op_proposta_evolucoes" ADD CONSTRAINT "op_proposta_evolucoes_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "op_proposta_importacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
