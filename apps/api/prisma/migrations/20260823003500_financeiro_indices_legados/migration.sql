-- Equivalência dos índices financeiros legados.
CREATE INDEX IF NOT EXISTS fin_dre_contas_grupo_dre_idx
  ON fin_dre_contas USING btree (grupo_dre);

CREATE INDEX IF NOT EXISTS fin_fluxos_saldo_data_ref_desc_idx
  ON fin_fluxos_saldo USING btree (data_ref DESC);

CREATE INDEX IF NOT EXISTS fin_notas_recebidas_emit_cnpj_idx
  ON fin_notas_recebidas USING btree (emit_cnpj);

-- O legado permite várias chaves NULL ou vazias e exige unicidade somente
-- para chaves preenchidas. Remove a UNIQUE integral criada no schema inicial.
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT c.conname INTO c_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'fin_notas_recebidas'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) = 'UNIQUE (chave)'
  LIMIT 1;

  IF c_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.fin_notas_recebidas DROP CONSTRAINT %I',
      c_name
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS fin_notas_recebidas_chave_preenchida_uq
  ON fin_notas_recebidas USING btree (chave)
  WHERE chave IS NOT NULL AND chave <> '';

CREATE INDEX IF NOT EXISTS fin_contas_pagar_dre_conta_idx
  ON fin_contas_pagar USING btree (dre_conta_id);
CREATE INDEX IF NOT EXISTS fin_contas_pagar_origem_nf_idx
  ON fin_contas_pagar USING btree (origem_nf_id);
CREATE INDEX IF NOT EXISTS fin_contas_pagar_data_pagamento_idx
  ON fin_contas_pagar USING btree (data_pagamento);

CREATE INDEX IF NOT EXISTS fin_contas_receber_cliente_nome_idx
  ON fin_contas_receber USING btree (cliente);
CREATE INDEX IF NOT EXISTS fin_contas_receber_filial_idx
  ON fin_contas_receber USING btree (filial);
CREATE INDEX IF NOT EXISTS fin_contas_receber_uf_idx
  ON fin_contas_receber USING btree (uf);
