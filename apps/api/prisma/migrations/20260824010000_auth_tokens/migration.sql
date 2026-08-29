CREATE TABLE tokens_autenticacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo varchar(30) NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  expira_em timestamp(3) NOT NULL,
  utilizado_em timestamp(3),
  criado_em timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip varchar(45),
  user_agent varchar(500),

  CONSTRAINT tokens_autenticacao_usuario_fk
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE,

  CONSTRAINT tokens_autenticacao_tipo_ck
    CHECK (tipo IN ('ATIVACAO', 'RECUPERACAO'))
);

CREATE INDEX tokens_autenticacao_usuario_tipo_criado_idx
  ON tokens_autenticacao
  (usuario_id, tipo, criado_em DESC);

CREATE INDEX tokens_autenticacao_expira_idx
  ON tokens_autenticacao (expira_em);
