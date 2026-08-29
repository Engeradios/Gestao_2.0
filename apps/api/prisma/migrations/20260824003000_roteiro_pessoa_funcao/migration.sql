ALTER TABLE op_roteiro_visitas
  ADD COLUMN IF NOT EXISTS pessoa_id uuid,
  ADD COLUMN IF NOT EXISTS funcao_profissional varchar(60);

UPDATE op_roteiro_visitas r
SET
  pessoa_id = l.pessoa_id,
  funcao_profissional = l.funcao
FROM op_listas l
WHERE l.tipo = 'responsavel'
  AND l.ativo = true
  AND lower(trim(l.nome)) = lower(trim(r.tecnico))
  AND r.pessoa_id IS NULL;

ALTER TABLE op_roteiro_visitas
  DROP CONSTRAINT IF EXISTS op_roteiro_visitas_pessoa_fk;

ALTER TABLE op_roteiro_visitas
  ADD CONSTRAINT op_roteiro_visitas_pessoa_fk
  FOREIGN KEY (pessoa_id)
  REFERENCES pessoas(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS op_roteiro_visitas_pessoa_data_idx
  ON op_roteiro_visitas (pessoa_id, data_visita);

CREATE UNIQUE INDEX IF NOT EXISTS op_roteiro_visitas_alocacao_uq
  ON op_roteiro_visitas (
    data_visita,
    unidade,
    pessoa_id,
    tipo,
    COALESCE(servico_id::text, ''),
    COALESCE(preventiva_id::text, ''),
    turno
  )
  WHERE pessoa_id IS NOT NULL
    AND status <> 'Cancelado';
