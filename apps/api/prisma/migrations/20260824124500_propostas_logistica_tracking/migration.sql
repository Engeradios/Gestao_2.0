CREATE TABLE op_propostas_logistica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id integer NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'NOVA',
  responsavel varchar(160),
  observacoes text,
  recebida_em timestamp without time zone,
  recebida_por varchar(160),
  criado_em timestamp without time zone
    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp without time zone
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT op_propostas_logistica_proposta_id_uq
    UNIQUE (proposta_id),

  CONSTRAINT op_propostas_logistica_proposta_id_fkey
    FOREIGN KEY (proposta_id)
    REFERENCES op_propostas(id)
    ON DELETE RESTRICT
);

CREATE INDEX op_propostas_logistica_status_criado_idx
ON op_propostas_logistica (
  status,
  criado_em DESC
);
