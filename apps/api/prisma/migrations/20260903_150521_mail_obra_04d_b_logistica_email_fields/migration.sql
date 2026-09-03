ALTER TABLE "op_servicos"
  ADD COLUMN IF NOT EXISTS "email_logistica_status" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "email_logistica_tentativas" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "email_logistica_erro" VARCHAR(1000);
