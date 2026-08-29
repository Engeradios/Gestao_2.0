CREATE TABLE IF NOT EXISTS "op_propostas" (
  "id" INTEGER NOT NULL,
  "numero" VARCHAR(100) NOT NULL,
  "local" VARCHAR(220),
  "status" VARCHAR(80) NOT NULL,
  "fase_negociacao" VARCHAR(120),
  "cliente_codigo" VARCHAR(80),
  "cliente_nome" VARCHAR(220) NOT NULL,
  "cliente_telefone" VARCHAR(80),
  "cliente_municipio" VARCHAR(120),
  "cliente_uf" VARCHAR(2),
  "contato_codigo" VARCHAR(80),
  "contato_nome" VARCHAR(160),
  "contato_email" VARCHAR(180),
  "contato_celular" VARCHAR(80),
  "representante_cod" VARCHAR(80),
  "representante_nome" VARCHAR(160),
  "data_inicio" DATE,
  "data_fim" DATE,
  "data_cadastro" DATE,
  "previsao_fechamento" DATE,
  "contrato" VARCHAR(120),
  "tipo" VARCHAR(160),
  "endereco_instalacao" VARCHAR(500),
  "titulo" VARCHAR(500),
  "ultima_origem" VARCHAR(120),
  "criado_em" TIMESTAMP(3),
  "atualizado_em" TIMESTAMP(3),
  CONSTRAINT "op_propostas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "op_propostas_numero_key" ON "op_propostas" (lower(trim("numero")));
CREATE INDEX IF NOT EXISTS "op_propostas_status_idx" ON "op_propostas" ("status");
CREATE INDEX IF NOT EXISTS "op_propostas_cliente_codigo_idx" ON "op_propostas" ("cliente_codigo");

ALTER TABLE "op_servicos" ADD COLUMN IF NOT EXISTS "proposta_id" INTEGER;
ALTER TABLE "op_servicos" ADD COLUMN IF NOT EXISTS "email_abertura_status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "op_servicos" ADD COLUMN IF NOT EXISTS "email_conclusao_status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE "op_servicos" ADD COLUMN IF NOT EXISTS "email_abertura_tentativas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "op_servicos" ADD COLUMN IF NOT EXISTS "email_conclusao_tentativas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "op_servicos" ADD COLUMN IF NOT EXISTS "email_abertura_erro" TEXT;
ALTER TABLE "op_servicos" ADD COLUMN IF NOT EXISTS "email_conclusao_erro" TEXT;
ALTER TABLE "op_email_logs" ADD COLUMN IF NOT EXISTS "tentativa" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "op_email_logs" ADD COLUMN IF NOT EXISTS "reenvio" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "op_email_logs" ADD COLUMN IF NOT EXISTS "codigo_erro" VARCHAR(100);
CREATE INDEX IF NOT EXISTS "op_servicos_proposta_id_idx" ON "op_servicos"("proposta_id");
CREATE INDEX IF NOT EXISTS "op_email_logs_tipo_sucesso_idx" ON "op_email_logs"("tipo","sucesso","enviado_em" DESC);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='op_servicos_proposta_id_fkey') THEN
    ALTER TABLE "op_servicos" ADD CONSTRAINT "op_servicos_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "op_propostas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
