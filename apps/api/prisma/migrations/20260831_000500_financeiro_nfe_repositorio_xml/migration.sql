ALTER TABLE fin_notas_recebidas
  ADD COLUMN IF NOT EXISTS xml_sha256 CHAR(64),
  ADD COLUMN IF NOT EXISTS nsu VARCHAR(20),
  ADD COLUMN IF NOT EXISTS schema_xml VARCHAR(120),
  ADD COLUMN IF NOT EXISTS capturado_em TIMESTAMP(6);

CREATE UNIQUE INDEX IF NOT EXISTS fin_notas_recebidas_filial_nsu_uq
  ON fin_notas_recebidas (filial_id, nsu)
  WHERE filial_id IS NOT NULL AND nsu IS NOT NULL AND nsu <> '';

CREATE INDEX IF NOT EXISTS fin_notas_recebidas_xml_sha256_idx
  ON fin_notas_recebidas (xml_sha256)
  WHERE xml_sha256 IS NOT NULL;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fin_notas_recebidas_xml_sha256_ck'
      AND conrelid = 'fin_notas_recebidas'::regclass
  ) THEN
    ALTER TABLE fin_notas_recebidas
      ADD CONSTRAINT fin_notas_recebidas_xml_sha256_ck
      CHECK (xml_sha256 IS NULL OR xml_sha256 ~ '^[0-9a-f]{64}$');
  END IF;
END
$block$;
