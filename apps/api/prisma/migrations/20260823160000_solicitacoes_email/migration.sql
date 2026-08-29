BEGIN;

CREATE TABLE configuracao_email (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  host VARCHAR(255),
  porta INTEGER NOT NULL DEFAULT 465,
  seguranca VARCHAR(20) NOT NULL DEFAULT 'SSL',
  usuario VARCHAR(255),
  senha_criptografada BYTEA,
  senha_iv BYTEA,
  senha_tag BYTEA,
  remetente_email VARCHAR(255),
  remetente_nome VARCHAR(160),
  responder_para VARCHAR(255),
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  timeout_segundos INTEGER NOT NULL DEFAULT 30,
  testado_em TIMESTAMP,
  teste_sucesso BOOLEAN,
  teste_detalhe VARCHAR(1000),
  atualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT configuracao_email_unica_ck CHECK (id = 1),
  CONSTRAINT configuracao_email_porta_ck
    CHECK (porta BETWEEN 1 AND 65535),
  CONSTRAINT configuracao_email_seguranca_ck
    CHECK (seguranca IN ('SSL', 'STARTTLS', 'NENHUMA')),
  CONSTRAINT configuracao_email_timeout_ck
    CHECK (timeout_segundos BETWEEN 5 AND 120)
);

CREATE TABLE solicitacoes (
  id BIGSERIAL PRIMARY KEY,
  protocolo VARCHAR(30) UNIQUE,
  solicitante_id UUID NOT NULL
    REFERENCES usuarios(id) ON DELETE RESTRICT,
  tipo VARCHAR(30) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  descricao TEXT NOT NULL,
  pagina_url VARCHAR(500),
  prioridade VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  status VARCHAR(30) NOT NULL DEFAULT 'ABERTA',
  resposta TEXT,
  responsavel_id UUID
    REFERENCES usuarios(id) ON DELETE SET NULL,
  email_status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  email_erro VARCHAR(1000),
  email_enviado_em TIMESTAMP,
  concluida_em TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT solicitacoes_tipo_ck CHECK (
    tipo IN ('ERRO', 'MELHORIA', 'NOVA_FUNCAO', 'OUTRA')
  ),
  CONSTRAINT solicitacoes_prioridade_ck CHECK (
    prioridade IN ('BAIXA', 'NORMAL', 'ALTA', 'CRITICA')
  ),
  CONSTRAINT solicitacoes_status_ck CHECK (
    status IN (
      'ABERTA',
      'EM_ANALISE',
      'EM_DESENVOLVIMENTO',
      'CONCLUIDA',
      'CANCELADA'
    )
  ),
  CONSTRAINT solicitacoes_email_status_ck CHECK (
    email_status IN ('PENDENTE', 'ENVIADO', 'FALHA')
  )
);

CREATE INDEX solicitacoes_solicitante_idx
  ON solicitacoes (solicitante_id, criado_em DESC);

CREATE INDEX solicitacoes_status_idx
  ON solicitacoes (status, criado_em DESC);

CREATE INDEX solicitacoes_tipo_idx
  ON solicitacoes (tipo, criado_em DESC);

CREATE TABLE solicitacao_historicos (
  id BIGSERIAL PRIMARY KEY,
  solicitacao_id BIGINT NOT NULL
    REFERENCES solicitacoes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao VARCHAR(60) NOT NULL,
  status_anterior VARCHAR(30),
  status_novo VARCHAR(30),
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX solicitacao_historicos_solicitacao_idx
  ON solicitacao_historicos (solicitacao_id, criado_em DESC);

CREATE TABLE email_logs (
  id BIGSERIAL PRIMARY KEY,
  contexto VARCHAR(40) NOT NULL,
  referencia_id VARCHAR(100),
  assunto VARCHAR(255) NOT NULL,
  destinatarios TEXT NOT NULL,
  quantidade_destinatarios INTEGER NOT NULL DEFAULT 0,
  sucesso BOOLEAN NOT NULL,
  detalhe VARCHAR(1000),
  codigo_erro VARCHAR(100),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  enviado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX email_logs_contexto_idx
  ON email_logs (contexto, enviado_em DESC);

CREATE INDEX email_logs_referencia_idx
  ON email_logs (referencia_id);

INSERT INTO configuracao_email (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO permissoes (id, hub, modulo, acao, descricao)
VALUES
  (
    gen_random_uuid(),
    'SOLICITACOES',
    'CENTRAL',
    'CRIAR',
    'Criar solicitações'
  ),
  (
    gen_random_uuid(),
    'SOLICITACOES',
    'CENTRAL',
    'VISUALIZAR',
    'Visualizar solicitações próprias'
  ),
  (
    gen_random_uuid(),
    'SOLICITACOES',
    'CENTRAL',
    'GERENCIAR',
    'Gerenciar todas as solicitações'
  ),
  (
    gen_random_uuid(),
    'FERRAMENTAS',
    'EMAIL',
    'CONFIGURAR',
    'Configurar servidor e envio de e-mail'
  )
ON CONFLICT (hub, modulo, acao) DO UPDATE
SET descricao = EXCLUDED.descricao;

INSERT INTO perfis_permissoes (
  perfil_id,
  permissao_id,
  efeito
)
SELECT
  perfil.id,
  permissao.id,
  'PERMITIR'
FROM perfis perfil
CROSS JOIN permissoes permissao
WHERE perfil.codigo = 'ADMINISTRADOR'
  AND (
    permissao.hub = 'SOLICITACOES'
    OR (
      permissao.hub = 'FERRAMENTAS'
      AND permissao.modulo = 'EMAIL'
    )
  )
ON CONFLICT (perfil_id, permissao_id) DO UPDATE
SET efeito = 'PERMITIR';

COMMIT;
