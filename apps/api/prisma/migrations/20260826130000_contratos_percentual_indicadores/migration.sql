-- Percentual de negociação e indicadores de vencimento
-- Os indicadores de 30/90 dias são calculados pela API sobre vigencia_fim.

ALTER TABLE "contratos_administrativos"
  ADD COLUMN IF NOT EXISTS "percentual_atual" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "contratos_andamentos"
  ADD COLUMN IF NOT EXISTS "percentual" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contratos_administrativos_percentual_atual_check'
  ) THEN
    ALTER TABLE "contratos_administrativos"
      ADD CONSTRAINT "contratos_administrativos_percentual_atual_check"
      CHECK ("percentual_atual" BETWEEN 0 AND 100);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contratos_andamentos_percentual_check'
  ) THEN
    ALTER TABLE "contratos_andamentos"
      ADD CONSTRAINT "contratos_andamentos_percentual_check"
      CHECK ("percentual" BETWEEN 0 AND 100);
  END IF;
END $$;
