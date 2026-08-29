CREATE TABLE IF NOT EXISTS op_tipos_proposta_area (
  tipo varchar(100) PRIMARY KEY,
  area varchar(20) NOT NULL,
  prazo_padrao_dias_uteis integer,
  ativo boolean NOT NULL DEFAULT true,
  atualizado_por varchar(160),
  criado_em timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT op_tipos_proposta_area_area_ck
    CHECK (area IN ('OPERACIONAL', 'LOGISTICA', 'AMBAS')),

  CONSTRAINT op_tipos_proposta_area_prazo_ck
    CHECK (
      prazo_padrao_dias_uteis IS NULL
      OR prazo_padrao_dias_uteis > 0
    )
);

CREATE INDEX IF NOT EXISTS op_tipos_proposta_area_area_ativo_idx
  ON op_tipos_proposta_area (area, ativo);

ALTER TABLE op_propostas
  ADD COLUMN IF NOT EXISTS prazo_execucao_dias_uteis integer;

ALTER TABLE op_servicos
  ADD COLUMN IF NOT EXISTS area_responsavel varchar(20);

ALTER TABLE op_servicos
  ADD COLUMN IF NOT EXISTS prazo_execucao_dias_uteis integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'op_propostas_prazo_execucao_ck'
  ) THEN
    ALTER TABLE op_propostas
      ADD CONSTRAINT op_propostas_prazo_execucao_ck
      CHECK (
        prazo_execucao_dias_uteis IS NULL
        OR prazo_execucao_dias_uteis > 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'op_servicos_area_responsavel_ck'
  ) THEN
    ALTER TABLE op_servicos
      ADD CONSTRAINT op_servicos_area_responsavel_ck
      CHECK (
        area_responsavel IS NULL
        OR area_responsavel IN (
          'OPERACIONAL',
          'LOGISTICA',
          'AMBAS'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'op_servicos_prazo_execucao_ck'
  ) THEN
    ALTER TABLE op_servicos
      ADD CONSTRAINT op_servicos_prazo_execucao_ck
      CHECK (
        prazo_execucao_dias_uteis IS NULL
        OR prazo_execucao_dias_uteis > 0
      );
  END IF;
END $$;

INSERT INTO op_tipos_proposta_area (
  tipo,
  area,
  prazo_padrao_dias_uteis,
  ativo,
  atualizado_por
)
VALUES
  ('Venda + Mão de Obra',       'AMBAS',       NULL, true, 'MIGRACAO_INICIAL'),
  ('Venda Consumidor Final',    'LOGISTICA',   NULL, true, 'MIGRACAO_INICIAL'),
  ('Locação Mensal',            'AMBAS',       NULL, true, 'MIGRACAO_INICIAL'),
  ('Aditivo Locação Mensal',    'AMBAS',       NULL, true, 'MIGRACAO_INICIAL'),
  ('Mão de Obra',               'OPERACIONAL', NULL, true, 'MIGRACAO_INICIAL'),
  ('Manutenção Preventiva',     'OPERACIONAL', NULL, true, 'MIGRACAO_INICIAL'),
  ('Manutenção Laboratorio',    'OPERACIONAL', NULL, true, 'MIGRACAO_INICIAL'),
  ('Locação Para Eventos',      'AMBAS',       NULL, true, 'MIGRACAO_INICIAL'),
  ('Remessa de Bonificação',    'LOGISTICA',   NULL, true, 'MIGRACAO_INICIAL'),
  ('Venda Parcelada',           'LOGISTICA',   NULL, true, 'MIGRACAO_INICIAL')
ON CONFLICT (tipo) DO UPDATE
SET
  area = EXCLUDED.area,
  ativo = EXCLUDED.ativo,
  atualizado_por = EXCLUDED.atualizado_por,
  atualizado_em = CURRENT_TIMESTAMP;

INSERT INTO op_tipos_proposta_area (
  tipo,
  area,
  ativo,
  atualizado_por
)
SELECT DISTINCT
  BTRIM(tipo),
  'OPERACIONAL',
  false,
  'SINCRONIZACAO_AUTOMATICA'
FROM op_propostas
WHERE NULLIF(BTRIM(tipo), '') IS NOT NULL
ON CONFLICT (tipo) DO NOTHING;

CREATE INDEX IF NOT EXISTS op_servicos_area_responsavel_idx
  ON op_servicos (area_responsavel);
