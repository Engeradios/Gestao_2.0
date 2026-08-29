-- Compras: base de importacao de itens de propostas aprovadas.
-- A aprovacao e definida exclusivamente pela coluna Status da planilha.

CREATE TABLE "compras_importacoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "arquivo" VARCHAR(255) NOT NULL,
  "hash_sha256" CHAR(64) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'PREVIA',
  "total_linhas" INTEGER NOT NULL DEFAULT 0,
  "linhas_aprovadas" INTEGER NOT NULL DEFAULT 0,
  "linhas_rejeitadas" INTEGER NOT NULL DEFAULT 0,
  "propostas" INTEGER NOT NULL DEFAULT 0,
  "itens_novos" INTEGER NOT NULL DEFAULT 0,
  "itens_atualizados" INTEGER NOT NULL DEFAULT 0,
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(200) NOT NULL,
  "erro" TEXT,
  "importado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compras_importacoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compras_importacoes_hash_sha256_key" UNIQUE ("hash_sha256"),
  CONSTRAINT "compras_importacoes_status_check" CHECK ("status" IN ('PREVIA','PROCESSANDO','CONCLUIDA','CONCLUIDA_COM_REJEICOES','FALHA')),
  CONSTRAINT "compras_importacoes_contagens_check" CHECK (
    "total_linhas" >= 0 AND "linhas_aprovadas" >= 0 AND "linhas_rejeitadas" >= 0
    AND "propostas" >= 0 AND "itens_novos" >= 0 AND "itens_atualizados" >= 0
  )
);

CREATE TABLE "compras_importacao_erros" (
  "id" BIGSERIAL NOT NULL,
  "importacao_id" UUID NOT NULL,
  "linha" INTEGER NOT NULL,
  "proposta_numero" VARCHAR(100),
  "produto_codigo" VARCHAR(120),
  "status_origem" VARCHAR(80),
  "motivo" TEXT NOT NULL,
  "dados" JSONB,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compras_importacao_erros_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compras_importacao_erros_linha_check" CHECK ("linha" >= 2)
);

CREATE TABLE "compras_propostas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "proposta_id" INTEGER,
  "proposta_numero" VARCHAR(100) NOT NULL,
  "status_aprovacao" VARCHAR(30) NOT NULL,
  "fase_negociacao" VARCHAR(120),
  "cliente_codigo" VARCHAR(100),
  "cliente_nome" VARCHAR(255),
  "local" VARCHAR(160),
  "contrato" VARCHAR(120),
  "tipo" VARCHAR(160),
  "status_compra" VARCHAR(40) NOT NULL DEFAULT 'NAO_INICIADA',
  "importacao_id" UUID NOT NULL,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compras_propostas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compras_propostas_proposta_numero_key" UNIQUE ("proposta_numero"),
  CONSTRAINT "compras_propostas_status_aprovacao_check" CHECK (upper(trim("status_aprovacao")) = 'APROVADO'),
  CONSTRAINT "compras_propostas_status_compra_check" CHECK ("status_compra" IN ('NAO_INICIADA','PARCIAL','COMPRADA','RECEBIDA_PARCIAL','RECEBIDA_TOTAL','CANCELADA'))
);

CREATE TABLE "compras_proposta_itens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compras_proposta_id" UUID NOT NULL,
  "linha_origem" INTEGER NOT NULL,
  "produto_codigo" VARCHAR(120) NOT NULL,
  "produto_descricao" VARCHAR(500) NOT NULL,
  "grupo_produto" VARCHAR(180),
  "grupo_2_produto" VARCHAR(180),
  "quantidade_necessaria" DECIMAL(15,4) NOT NULL,
  "quantidade_comprada" DECIMAL(15,4) NOT NULL DEFAULT 0,
  "quantidade_recebida" DECIMAL(15,4) NOT NULL DEFAULT 0,
  "valor_unitario_venda" DECIMAL(15,4),
  "desconto_produto" DECIMAL(15,4),
  "valor_desconto" DECIMAL(15,4),
  "valor_total_venda" DECIMAL(15,4),
  "status_item" VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "fingerprint" CHAR(64) NOT NULL,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compras_proposta_itens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compras_proposta_itens_quantidades_check" CHECK (
    "quantidade_necessaria" > 0 AND "quantidade_comprada" >= 0 AND "quantidade_recebida" >= 0
    AND "quantidade_comprada" <= "quantidade_necessaria"
    AND "quantidade_recebida" <= "quantidade_comprada"
  ),
  CONSTRAINT "compras_proposta_itens_status_check" CHECK ("status_item" IN ('PENDENTE','COMPRA_PARCIAL','COMPRADO','RECEBIDO_PARCIAL','RECEBIDO_TOTAL','CANCELADO')),
  CONSTRAINT "compras_proposta_itens_fingerprint_check" CHECK ("fingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "compras_historicos" (
  "id" BIGSERIAL NOT NULL,
  "importacao_id" UUID,
  "compras_proposta_id" UUID,
  "entidade" VARCHAR(80) NOT NULL,
  "entidade_id" VARCHAR(100) NOT NULL,
  "acao" VARCHAR(80) NOT NULL,
  "dados_antes" JSONB,
  "dados_depois" JSONB,
  "usuario_id" UUID,
  "usuario_nome" VARCHAR(200) NOT NULL,
  "registrado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compras_historicos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "compras_importacoes_importado_em_idx" ON "compras_importacoes"("importado_em" DESC);
CREATE INDEX "compras_importacoes_status_importado_em_idx" ON "compras_importacoes"("status", "importado_em" DESC);
CREATE INDEX "compras_importacao_erros_importacao_id_linha_idx" ON "compras_importacao_erros"("importacao_id", "linha");
CREATE INDEX "compras_importacao_erros_proposta_numero_idx" ON "compras_importacao_erros"("proposta_numero");
CREATE INDEX "compras_propostas_proposta_id_idx" ON "compras_propostas"("proposta_id");
CREATE INDEX "compras_propostas_status_aprovacao_status_compra_idx" ON "compras_propostas"("status_aprovacao", "status_compra");
CREATE INDEX "compras_propostas_cliente_codigo_idx" ON "compras_propostas"("cliente_codigo");
CREATE UNIQUE INDEX "compras_proposta_itens_proposta_fingerprint_key" ON "compras_proposta_itens"("compras_proposta_id", "fingerprint");
CREATE INDEX "compras_proposta_itens_produto_codigo_idx" ON "compras_proposta_itens"("produto_codigo");
CREATE INDEX "compras_proposta_itens_status_ativo_idx" ON "compras_proposta_itens"("status_item", "ativo");
CREATE INDEX "compras_historicos_entidade_data_idx" ON "compras_historicos"("entidade", "entidade_id", "registrado_em" DESC);
CREATE INDEX "compras_historicos_proposta_data_idx" ON "compras_historicos"("compras_proposta_id", "registrado_em" DESC);
CREATE INDEX "compras_historicos_importacao_idx" ON "compras_historicos"("importacao_id");

ALTER TABLE "compras_importacao_erros" ADD CONSTRAINT "compras_importacao_erros_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "compras_importacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compras_propostas" ADD CONSTRAINT "compras_propostas_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "compras_importacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compras_propostas" ADD CONSTRAINT "compras_propostas_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "op_propostas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compras_proposta_itens" ADD CONSTRAINT "compras_proposta_itens_compras_proposta_id_fkey" FOREIGN KEY ("compras_proposta_id") REFERENCES "compras_propostas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compras_historicos" ADD CONSTRAINT "compras_historicos_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "compras_importacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compras_historicos" ADD CONSTRAINT "compras_historicos_compras_proposta_id_fkey" FOREIGN KEY ("compras_proposta_id") REFERENCES "compras_propostas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(), v.hub, v.modulo, v.acao, v.descricao, CURRENT_TIMESTAMP
FROM (VALUES
  ('COMPRAS','IMPORTACAO','VISUALIZAR','Visualizar importacoes de materiais de propostas aprovadas'),
  ('COMPRAS','IMPORTACAO','EXECUTAR','Executar importacao de materiais de propostas aprovadas'),
  ('COMPRAS','PAINEL','VISUALIZAR','Visualizar painel de compras'),
  ('COMPRAS','DASHBOARD','VISUALIZAR','Visualizar dashboard de compras')
) AS v(hub,modulo,acao,descricao)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissoes" p
  WHERE p."hub"=v.hub AND p."modulo"=v.modulo AND p."acao"=v.acao
);

INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT pf."id", pe."id", 'PERMITIR'::"EfeitoPermissao", CURRENT_TIMESTAMP
FROM "perfis" pf
CROSS JOIN "permissoes" pe
WHERE upper(pf."nome") = 'ADMINISTRADOR'
  AND pe."hub" = 'COMPRAS'
  AND NOT EXISTS (
    SELECT 1 FROM "perfis_permissoes" pp
    WHERE pp."perfil_id"=pf."id" AND pp."permissao_id"=pe."id"
  );
