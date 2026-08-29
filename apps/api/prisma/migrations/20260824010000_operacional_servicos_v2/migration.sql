ALTER TABLE op_servicos
  ADD COLUMN IF NOT EXISTS contrato varchar(120),
  ADD COLUMN IF NOT EXISTS pedido varchar(100),
  ADD COLUMN IF NOT EXISTS contato_nome varchar(160),
  ADD COLUMN IF NOT EXISTS contato_email varchar(180),
  ADD COLUMN IF NOT EXISTS contato_telefone varchar(80),
  ADD COLUMN IF NOT EXISTS endereco_instalacao varchar(500),
  ADD COLUMN IF NOT EXISTS titulo varchar(500),
  ADD COLUMN IF NOT EXISTS status_base varchar(80),
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inativado_em timestamp,
  ADD COLUMN IF NOT EXISTS inativado_por varchar(160);

UPDATE op_servicos s
SET
  contrato = COALESCE(s.contrato, p.contrato),
  contato_nome = COALESCE(s.contato_nome, p.contato_nome),
  contato_email = COALESCE(s.contato_email, p.contato_email),
  contato_telefone = COALESCE(
    s.contato_telefone,
    p.contato_celular,
    p.cliente_telefone
  ),
  endereco_instalacao = COALESCE(
    s.endereco_instalacao,
    p.endereco_instalacao,
    p.local
  ),
  titulo = COALESCE(s.titulo, p.titulo)
FROM op_propostas p
WHERE p.id = s.proposta_id;

CREATE UNIQUE INDEX IF NOT EXISTS op_servicos_proposta_id_uq
  ON op_servicos(proposta_id)
  WHERE proposta_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS op_servico_responsaveis (
  servico_id uuid NOT NULL,
  pessoa_id uuid NOT NULL,
  papel varchar(60),
  atribuido_por varchar(160),
  atribuido_em timestamp NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true,

  CONSTRAINT op_servico_responsaveis_pkey
    PRIMARY KEY (servico_id, pessoa_id),

  CONSTRAINT op_servico_responsaveis_servico_fk
    FOREIGN KEY (servico_id)
    REFERENCES op_servicos(id)
    ON DELETE CASCADE,

  CONSTRAINT op_servico_responsaveis_pessoa_fk
    FOREIGN KEY (pessoa_id)
    REFERENCES pessoas(id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS op_servico_responsaveis_pessoa_idx
  ON op_servico_responsaveis(pessoa_id, ativo);

CREATE TABLE IF NOT EXISTS op_servico_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid NOT NULL,
  tipo varchar(60) NOT NULL DEFAULT 'DOCUMENTO',
  nome_original varchar(255) NOT NULL,
  nome_armazenado varchar(255) NOT NULL,
  mime_type varchar(120),
  tamanho bigint,
  caminho varchar(500) NOT NULL,
  hash_sha256 varchar(64),
  criado_por varchar(160),
  criado_em timestamp NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true,

  CONSTRAINT op_servico_anexos_servico_fk
    FOREIGN KEY (servico_id)
    REFERENCES op_servicos(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS op_servico_anexos_servico_idx
  ON op_servico_anexos(servico_id, criado_em DESC);
