CREATE TABLE IF NOT EXISTS "os_sla_configuracoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(120) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "normal_ate_minutos" INTEGER NOT NULL DEFAULT 1440,
  "atencao_ate_minutos" INTEGER NOT NULL DEFAULT 2880,
  "urgente_ate_minutos" INTEGER NOT NULL DEFAULT 4320,
  "fuso_horario" VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo',
  "atualizado_por_id" UUID,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "os_sla_configuracoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "os_sla_configuracoes_limites_check"
    CHECK (
      "normal_ate_minutos" > 0
      AND "atencao_ate_minutos" > "normal_ate_minutos"
      AND "urgente_ate_minutos" > "atencao_ate_minutos"
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "os_sla_configuracoes_nome_key"
ON "os_sla_configuracoes" ("nome");

CREATE TABLE IF NOT EXISTS "os_sla_horarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "configuracao_id" UUID NOT NULL,
  "dia_semana" SMALLINT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "inicio" TIME NOT NULL DEFAULT '08:00',
  "fim" TIME NOT NULL DEFAULT '17:00',
  "intervalo_inicio" TIME,
  "intervalo_fim" TIME,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "os_sla_horarios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "os_sla_horarios_configuracao_fkey"
    FOREIGN KEY ("configuracao_id")
    REFERENCES "os_sla_configuracoes"("id")
    ON DELETE CASCADE,
  CONSTRAINT "os_sla_horarios_dia_check"
    CHECK ("dia_semana" BETWEEN 0 AND 6),
  CONSTRAINT "os_sla_horarios_periodo_check"
    CHECK ("fim" > "inicio"),
  CONSTRAINT "os_sla_horarios_configuracao_dia_key"
    UNIQUE ("configuracao_id", "dia_semana")
);

CREATE TABLE IF NOT EXISTS "os_sla_feriados" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "configuracao_id" UUID NOT NULL,
  "data" DATE NOT NULL,
  "nome" VARCHAR(160) NOT NULL,
  "uf" CHAR(2),
  "municipio" VARCHAR(120),
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "os_sla_feriados_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "os_sla_feriados_configuracao_fkey"
    FOREIGN KEY ("configuracao_id")
    REFERENCES "os_sla_configuracoes"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "os_sla_feriados_escopo_key"
ON "os_sla_feriados" (
  "configuracao_id",
  "data",
  COALESCE("uf", ''),
  COALESCE("municipio", '')
);

CREATE TABLE IF NOT EXISTS "os_importacoes_auditoria" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(200) NOT NULL,
  "arquivo" VARCHAR(255) NOT NULL,
  "hash_sha256" CHAR(64) NOT NULL,
  "status" VARCHAR(30) NOT NULL,
  "total_lido" INTEGER NOT NULL DEFAULT 0,
  "incluidos" INTEGER NOT NULL DEFAULT 0,
  "alterados" INTEGER NOT NULL DEFAULT 0,
  "ignorados" INTEGER NOT NULL DEFAULT 0,
  "rejeitados" INTEGER NOT NULL DEFAULT 0,
  "duracao_ms" INTEGER,
  "erro" TEXT,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "os_importacoes_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "os_importacoes_auditoria_criado_idx"
ON "os_importacoes_auditoria" ("criado_em");

CREATE INDEX IF NOT EXISTS "os_importacoes_auditoria_usuario_idx"
ON "os_importacoes_auditoria" ("usuario_id", "criado_em");

CREATE TABLE IF NOT EXISTS "os_historico_alteracoes" (
  "id" BIGSERIAL NOT NULL,
  "ordem_servico_id" UUID,
  "numero_os" VARCHAR(60) NOT NULL,
  "importacao_id" UUID,
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(200) NOT NULL,
  "campo" VARCHAR(120) NOT NULL,
  "valor_anterior" JSONB,
  "valor_novo" JSONB,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "os_historico_alteracoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "os_historico_alteracoes_importacao_fkey"
    FOREIGN KEY ("importacao_id")
    REFERENCES "os_importacoes_auditoria"("id")
    ON DELETE SET NULL,
  CONSTRAINT "os_historico_alteracoes_os_fkey"
    FOREIGN KEY ("ordem_servico_id")
    REFERENCES "ordens_servico"("id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "os_historico_numero_criado_idx"
ON "os_historico_alteracoes" ("numero_os", "criado_em");

CREATE INDEX IF NOT EXISTS "os_historico_importacao_idx"
ON "os_historico_alteracoes" ("importacao_id");

CREATE OR REPLACE FUNCTION impedir_alteracao_os_historico()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'os_historico_alteracoes é append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS
  os_historico_append_only
ON os_historico_alteracoes;

CREATE TRIGGER os_historico_append_only
BEFORE UPDATE OR DELETE
ON os_historico_alteracoes
FOR EACH ROW
EXECUTE FUNCTION impedir_alteracao_os_historico();

INSERT INTO "os_sla_configuracoes" (
  "nome",
  "normal_ate_minutos",
  "atencao_ate_minutos",
  "urgente_ate_minutos"
)
VALUES ('SLA padrão Ordens de Serviço', 1440, 2880, 4320)
ON CONFLICT ("nome") DO NOTHING;

INSERT INTO "os_sla_horarios" (
  "configuracao_id",
  "dia_semana",
  "ativo",
  "inicio",
  "fim"
)
SELECT c.id, d.dia, TRUE, '08:00', '17:00'
FROM "os_sla_configuracoes" c
CROSS JOIN (
  VALUES (1), (2), (3), (4), (5)
) AS d(dia)
WHERE c.nome = 'SLA padrão Ordens de Serviço'
ON CONFLICT ("configuracao_id", "dia_semana") DO NOTHING;

INSERT INTO "permissoes" (
  "id", "hub", "modulo", "acao", "descricao"
)
VALUES
  (gen_random_uuid(), 'ORDENS_SERVICO', 'DASHBOARD', 'VISUALIZAR',
   'Visualizar dashboard de Ordens de Serviço'),
  (gen_random_uuid(), 'ORDENS_SERVICO', 'PAINEL', 'VISUALIZAR',
   'Visualizar painel de Ordens de Serviço'),
  (gen_random_uuid(), 'ORDENS_SERVICO', 'LABORATORIO', 'VISUALIZAR',
   'Visualizar painel de laboratório'),
  (gen_random_uuid(), 'ORDENS_SERVICO', 'IMPORTACAO', 'EXECUTAR',
   'Executar importações de Ordens de Serviço'),
  (gen_random_uuid(), 'ORDENS_SERVICO', 'IMPORTACAO', 'AUDITAR',
   'Consultar auditoria das importações'),
  (gen_random_uuid(), 'FERRAMENTAS', 'SLA_OS', 'GERENCIAR',
   'Gerenciar SLA de Ordens de Serviço')
ON CONFLICT ("hub", "modulo", "acao") DO NOTHING;
