ALTER TABLE "op_servicos"
  ADD COLUMN IF NOT EXISTS "praca_responsavel" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "chegada_prevista" DATE,
  ADD COLUMN IF NOT EXISTS "origem_data_aprovacao" VARCHAR(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'op_servicos_origem_data_aprovacao_ck'
      AND conrelid = 'op_servicos'::regclass
  ) THEN
    ALTER TABLE "op_servicos"
      ADD CONSTRAINT "op_servicos_origem_data_aprovacao_ck"
      CHECK (
        "origem_data_aprovacao" IS NULL
        OR "origem_data_aprovacao" IN (
          'HISTORICO_STATUS',
          'ATUALIZADO_EM',
          'DATA_CADASTRO'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "op_servicos_uf_praca_idx"
  ON "op_servicos" ("uf_execucao", "praca_responsavel");

CREATE INDEX IF NOT EXISTS "op_servicos_chegada_prevista_idx"
  ON "op_servicos" ("chegada_prevista")
  WHERE "chegada_prevista" IS NOT NULL;
