-- Modulo Propostas: evolução idempotente do schema existente.
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS motivo VARCHAR(180);
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_produtos NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_servicos NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_tarifadores NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_desconto NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS tipo_frete VARCHAR(100);
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_frete_ida NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_frete_volta NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_frete NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS transportadora VARCHAR(220);
ALTER TABLE op_propostas ADD COLUMN IF NOT EXISTS val_proposta NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE op_propostas ALTER COLUMN cliente_nome DROP NOT NULL;


-- A evolução referencia o número imutável da proposta.
-- A constraint UNIQUE precisa existir antes da criação da FK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'op_propostas'::regclass
      AND conname = 'op_propostas_numero_uq'
  ) THEN
    ALTER TABLE op_propostas
      ADD CONSTRAINT op_propostas_numero_uq UNIQUE (numero);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS op_proposta_evolucoes (
  id BIGSERIAL PRIMARY KEY,
  proposta_numero VARCHAR(100) NOT NULL,
  campo VARCHAR(80) NOT NULL,
  valor_antigo TEXT,
  valor_novo TEXT,
  origem VARCHAR(255),
  usuario VARCHAR(180),
  registrado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT op_proposta_evolucoes_proposta_numero_fkey
    FOREIGN KEY (proposta_numero) REFERENCES op_propostas(numero)
    ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS op_proposta_evolucoes_numero_data_idx
  ON op_proposta_evolucoes(proposta_numero, registrado_em DESC, id DESC);
CREATE INDEX IF NOT EXISTS op_proposta_evolucoes_campo_idx
  ON op_proposta_evolucoes(campo);

CREATE TABLE IF NOT EXISTS op_proposta_importacoes (
  id BIGSERIAL PRIMARY KEY,
  origem VARCHAR(255) NOT NULL,
  total_linhas INTEGER NOT NULL DEFAULT 0,
  novas INTEGER NOT NULL DEFAULT 0,
  atualizadas INTEGER NOT NULL DEFAULT 0,
  canceladas INTEGER NOT NULL DEFAULT 0,
  usuario VARCHAR(180),
  importado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS op_proposta_importacoes_data_idx
  ON op_proposta_importacoes(importado_em DESC);

CREATE TABLE IF NOT EXISTS op_proposta_configuracoes (
  chave VARCHAR(60) PRIMARY KEY,
  valor TEXT,
  atualizado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO op_proposta_configuracoes(chave, valor)
VALUES ('prop_dias_cancela','90')
ON CONFLICT (chave) DO NOTHING;

CREATE INDEX IF NOT EXISTS op_propostas_status_idx ON op_propostas(status);
CREATE INDEX IF NOT EXISTS op_propostas_fase_idx ON op_propostas(fase_negociacao);
CREATE INDEX IF NOT EXISTS op_propostas_local_idx ON op_propostas(local);
CREATE INDEX IF NOT EXISTS op_propostas_representante_idx ON op_propostas(representante_nome);
CREATE INDEX IF NOT EXISTS op_propostas_uf_idx ON op_propostas(cliente_uf);
CREATE INDEX IF NOT EXISTS op_propostas_data_idx ON op_propostas(data_cadastro);
CREATE INDEX IF NOT EXISTS op_propostas_valor_idx ON op_propostas(val_proposta);
