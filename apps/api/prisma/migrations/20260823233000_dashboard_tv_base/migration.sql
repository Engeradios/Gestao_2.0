CREATE TABLE IF NOT EXISTS "dashboard_tv_paineis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" VARCHAR(160) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "descricao" VARCHAR(500),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "publicado" BOOLEAN NOT NULL DEFAULT false,
  "tema" VARCHAR(30) NOT NULL DEFAULT 'ESCURO',
  "atualizacao_minutos" INTEGER NOT NULL DEFAULT 5,
  "cena_segundos" INTEGER NOT NULL DEFAULT 12,
  "mostrar_clima" BOOLEAN NOT NULL DEFAULT true,
  "mostrar_relogio" BOOLEAN NOT NULL DEFAULT true,
  "mostrar_paginacao" BOOLEAN NOT NULL DEFAULT true,
  "permitir_financeiro" BOOLEAN NOT NULL DEFAULT false,
  "criado_por" VARCHAR(160),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_tv_paineis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dashboard_tv_paineis_slug_key" UNIQUE ("slug")
);
CREATE TABLE IF NOT EXISTS "dashboard_tv_cenas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dashboard_id" UUID NOT NULL,
  "nome" VARCHAR(160) NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  "duracao_segundos" INTEGER,
  "configuracao" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_tv_cenas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dashboard_tv_cenas_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard_tv_paineis"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "dashboard_tv_widgets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cena_id" UUID NOT NULL,
  "tipo" VARCHAR(100) NOT NULL,
  "titulo" VARCHAR(180) NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "configuracao" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_tv_widgets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dashboard_tv_widgets_cena_id_fkey" FOREIGN KEY ("cena_id") REFERENCES "dashboard_tv_cenas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "dashboard_tv_paineis_ativo_publicado_idx" ON "dashboard_tv_paineis"("ativo", "publicado");
CREATE INDEX IF NOT EXISTS "dashboard_tv_cenas_dashboard_id_ordem_idx" ON "dashboard_tv_cenas"("dashboard_id", "ordem");
CREATE INDEX IF NOT EXISTS "dashboard_tv_widgets_cena_id_ordem_idx" ON "dashboard_tv_widgets"("cena_id", "ordem");
CREATE INDEX IF NOT EXISTS "dashboard_tv_widgets_tipo_idx" ON "dashboard_tv_widgets"("tipo");

INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(),'DASHBOARD_TV','PAINEL',x.acao,x.descricao,CURRENT_TIMESTAMP
FROM (VALUES
 ('VISUALIZAR','Visualizar painéis de Dashboard TV'),
 ('GERENCIAR','Criar e configurar painéis de Dashboard TV'),
 ('PUBLICAR','Publicar e retirar painéis de Dashboard TV')
) AS x(acao,descricao)
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" p WHERE p."hub"='DASHBOARD_TV' AND p."modulo"='PAINEL' AND p."acao"=x.acao);
INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(),'DASHBOARD_TV','FINANCEIRO','VISUALIZAR','Permitir indicadores financeiros no Dashboard TV',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" p WHERE p."hub"='DASHBOARD_TV' AND p."modulo"='FINANCEIRO' AND p."acao"='VISUALIZAR');

INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT pf.id, pe.id, 'PERMITIR', CURRENT_TIMESTAMP
FROM "perfis" pf CROSS JOIN "permissoes" pe
WHERE (upper(pf.codigo) IN ('ADMIN','ADMINISTRADOR') OR upper(pf.nome)='ADMINISTRADOR')
  AND pe.hub='DASHBOARD_TV'
  AND NOT EXISTS (SELECT 1 FROM "perfis_permissoes" pp WHERE pp.perfil_id=pf.id AND pp.permissao_id=pe.id);
