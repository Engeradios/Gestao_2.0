BEGIN;

CREATE TABLE pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(200),
  telefone VARCHAR(60),
  unidade VARCHAR(10),
  cargo VARCHAR(120),
  cnh VARCHAR(40),
  vencimento_cnh DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX pessoas_email_uq
  ON pessoas (LOWER(email))
  WHERE email IS NOT NULL;

CREATE INDEX pessoas_nome_idx ON pessoas (nome);
CREATE INDEX pessoas_ativo_idx ON pessoas (ativo);

CREATE TABLE pessoas_funcoes (
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  funcao VARCHAR(40) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pessoa_id, funcao),
  CONSTRAINT pessoas_funcoes_tipo_ck CHECK (
    funcao IN (
      'USUARIO',
      'TECNICO',
      'SUPERVISOR',
      'AUXILIAR_TECNICO',
      'MOTORISTA',
      'ENTREGADOR'
    )
  )
);

CREATE INDEX pessoas_funcoes_funcao_idx
  ON pessoas_funcoes (funcao, ativo);

CREATE TABLE pessoas_origens (
  id BIGSERIAL PRIMARY KEY,
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  origem VARCHAR(40) NOT NULL,
  origem_id VARCHAR(100) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (origem, origem_id)
);

CREATE INDEX pessoas_origens_pessoa_idx
  ON pessoas_origens (pessoa_id);

CREATE TABLE preferencias_notificacao_usuario (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  receber_solicitacoes BOOLEAN NOT NULL DEFAULT FALSE,
  receber_abertura_servico BOOLEAN NOT NULL DEFAULT FALSE,
  receber_conclusao_faturamento BOOLEAN NOT NULL DEFAULT FALSE,
  receber_logistica BOOLEAN NOT NULL DEFAULT FALSE,
  receber_notificacoes_sistema BOOLEAN NOT NULL DEFAULT TRUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios
  ADD COLUMN pessoa_id UUID;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_pessoa_id_fkey
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX usuarios_pessoa_id_uq
  ON usuarios (pessoa_id)
  WHERE pessoa_id IS NOT NULL;

ALTER TABLE op_listas
  ADD COLUMN pessoa_id UUID;

ALTER TABLE op_listas
  ADD CONSTRAINT op_listas_pessoa_id_fkey
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL;

CREATE INDEX op_listas_pessoa_id_idx ON op_listas (pessoa_id);

ALTER TABLE op_entregadores
  ADD COLUMN pessoa_id UUID;

ALTER TABLE op_entregadores
  ADD CONSTRAINT op_entregadores_pessoa_id_fkey
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX op_entregadores_pessoa_id_uq
  ON op_entregadores (pessoa_id)
  WHERE pessoa_id IS NOT NULL;

COMMIT;
