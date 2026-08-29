CREATE TABLE notificacoes_usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo varchar(60) NOT NULL,
  titulo varchar(200) NOT NULL,
  mensagem text NOT NULL,
  link varchar(500),
  referencia_id varchar(100),
  chave_evento varchar(200),
  dados jsonb,
  lida_em timestamp(3),
  criado_em timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em timestamp(3),

  CONSTRAINT notificacoes_usuario_pkey PRIMARY KEY (id),

  CONSTRAINT notificacoes_usuario_usuario_id_fkey
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX notificacoes_usuario_usuario_criado_idx
ON notificacoes_usuario (usuario_id, criado_em DESC);

CREATE INDEX notificacoes_usuario_nao_lidas_idx
ON notificacoes_usuario (usuario_id, lida_em, criado_em DESC);

CREATE INDEX notificacoes_usuario_tipo_criado_idx
ON notificacoes_usuario (tipo, criado_em DESC);

CREATE INDEX notificacoes_usuario_referencia_idx
ON notificacoes_usuario (referencia_id);

CREATE UNIQUE INDEX notificacoes_usuario_evento_usuario_uq
ON notificacoes_usuario (usuario_id, chave_evento)
WHERE chave_evento IS NOT NULL;
