ALTER TABLE preferencias_notificacao_usuario
  ADD COLUMN IF NOT EXISTS area_servicos varchar(20);

UPDATE preferencias_notificacao_usuario
SET area_servicos =
  CASE
    WHEN receber_abertura_servico
         AND receber_logistica
      THEN 'AMBAS'
    WHEN receber_logistica
      THEN 'LOGISTICA'
    ELSE 'OPERACIONAL'
  END
WHERE area_servicos IS NULL
   OR BTRIM(area_servicos) = '';

ALTER TABLE preferencias_notificacao_usuario
  ALTER COLUMN area_servicos
  SET DEFAULT 'OPERACIONAL';

ALTER TABLE preferencias_notificacao_usuario
  ALTER COLUMN area_servicos
  SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'preferencias_notificacao_area_servicos_ck'
  ) THEN
    ALTER TABLE preferencias_notificacao_usuario
      ADD CONSTRAINT
        preferencias_notificacao_area_servicos_ck
      CHECK (
        area_servicos IN (
          'OPERACIONAL',
          'LOGISTICA',
          'AMBAS'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS
  preferencias_notificacao_area_ativo_idx
ON preferencias_notificacao_usuario (
  area_servicos,
  ativo
);

ALTER TABLE op_email_logs
  ADD COLUMN IF NOT EXISTS chave_evento varchar(180);

CREATE UNIQUE INDEX IF NOT EXISTS
  op_email_logs_chave_evento_uq
ON op_email_logs (chave_evento)
WHERE chave_evento IS NOT NULL;
