-- Estrutura de fornecedores, pedidos, rateios e recebimentos de Compras.
CREATE TABLE "compras_fornecedores" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "razao_social" VARCHAR(255) NOT NULL,
 "nome_fantasia" VARCHAR(255), "documento" VARCHAR(20), "email" VARCHAR(255),
 "telefone" VARCHAR(30), "contato" VARCHAR(160), "observacoes" TEXT,
 "ativo" BOOLEAN NOT NULL DEFAULT true, "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "compras_fornecedores_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "compras_fornecedores_documento_check" CHECK ("documento" IS NULL OR "documento" ~ '^[0-9]{11,14}$')
);
CREATE UNIQUE INDEX "compras_fornecedores_documento_key" ON "compras_fornecedores"("documento") WHERE "documento" IS NOT NULL;
CREATE INDEX "compras_fornecedores_razao_social_idx" ON "compras_fornecedores"("razao_social");
CREATE INDEX "compras_fornecedores_ativo_idx" ON "compras_fornecedores"("ativo");

CREATE TABLE "compras_pedidos" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "numero" VARCHAR(60) NOT NULL, "fornecedor_id" UUID NOT NULL,
 "status" VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO', "data_pedido" DATE, "previsao_entrega" DATE,
 "condicao_pagamento" VARCHAR(255), "frete" DECIMAL(15,2) NOT NULL DEFAULT 0,
 "desconto" DECIMAL(15,2) NOT NULL DEFAULT 0, "valor_produtos" DECIMAL(15,2) NOT NULL DEFAULT 0,
 "valor_total" DECIMAL(15,2) NOT NULL DEFAULT 0, "observacoes" TEXT, "usuario_id" UUID,
 "usuario_nome" VARCHAR(200) NOT NULL, "confirmado_em" TIMESTAMP(6),
 "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "compras_pedidos_pkey" PRIMARY KEY ("id"), CONSTRAINT "compras_pedidos_numero_key" UNIQUE ("numero"),
 CONSTRAINT "compras_pedidos_status_check" CHECK ("status" IN ('RASCUNHO','CONFIRMADO','ENVIADO','PARCIALMENTE_RECEBIDO','RECEBIDO','CANCELADO')),
 CONSTRAINT "compras_pedidos_valores_check" CHECK ("frete">=0 AND "desconto">=0 AND "valor_produtos">=0 AND "valor_total">=0),
 CONSTRAINT "compras_pedidos_datas_check" CHECK ("previsao_entrega" IS NULL OR "data_pedido" IS NULL OR "previsao_entrega">="data_pedido")
);
CREATE INDEX "compras_pedidos_fornecedor_status_idx" ON "compras_pedidos"("fornecedor_id","status");
CREATE INDEX "compras_pedidos_status_previsao_idx" ON "compras_pedidos"("status","previsao_entrega");

CREATE TABLE "compras_pedido_itens" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "pedido_id" UUID NOT NULL, "produto_codigo" VARCHAR(120) NOT NULL,
 "produto_descricao" VARCHAR(500) NOT NULL, "quantidade" DECIMAL(15,4) NOT NULL,
 "quantidade_recebida" DECIMAL(15,4) NOT NULL DEFAULT 0, "valor_unitario" DECIMAL(15,4) NOT NULL,
 "desconto" DECIMAL(15,2) NOT NULL DEFAULT 0, "valor_total" DECIMAL(15,2) NOT NULL,
 "status" VARCHAR(40) NOT NULL DEFAULT 'PENDENTE', "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "compras_pedido_itens_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "compras_pedido_itens_pedido_produto_key" UNIQUE ("pedido_id","produto_codigo"),
 CONSTRAINT "compras_pedido_itens_quantidades_check" CHECK ("quantidade">0 AND "quantidade_recebida">=0 AND "quantidade_recebida"<="quantidade"),
 CONSTRAINT "compras_pedido_itens_valores_check" CHECK ("valor_unitario">=0 AND "desconto">=0 AND "valor_total">=0),
 CONSTRAINT "compras_pedido_itens_status_check" CHECK ("status" IN ('PENDENTE','PARCIALMENTE_RECEBIDO','RECEBIDO','CANCELADO'))
);
CREATE INDEX "compras_pedido_itens_produto_idx" ON "compras_pedido_itens"("produto_codigo");
CREATE INDEX "compras_pedido_itens_status_idx" ON "compras_pedido_itens"("status");

CREATE TABLE "compras_pedido_rateios" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "pedido_item_id" UUID NOT NULL,
 "compras_proposta_item_id" UUID NOT NULL, "quantidade" DECIMAL(15,4) NOT NULL,
 "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "compras_pedido_rateios_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "compras_pedido_rateios_item_proposta_key" UNIQUE ("pedido_item_id","compras_proposta_item_id"),
 CONSTRAINT "compras_pedido_rateios_quantidade_check" CHECK ("quantidade">0)
);
CREATE INDEX "compras_pedido_rateios_proposta_item_idx" ON "compras_pedido_rateios"("compras_proposta_item_id");

CREATE TABLE "compras_recebimentos" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "pedido_id" UUID NOT NULL, "numero_documento" VARCHAR(100),
 "data_recebimento" TIMESTAMP(6) NOT NULL, "status" VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO', "observacoes" TEXT,
 "usuario_id" UUID, "usuario_nome" VARCHAR(200) NOT NULL, "confirmado_em" TIMESTAMP(6),
 "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "compras_recebimentos_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "compras_recebimentos_status_check" CHECK ("status" IN ('RASCUNHO','CONFIRMADO','CANCELADO'))
);
CREATE INDEX "compras_recebimentos_pedido_data_idx" ON "compras_recebimentos"("pedido_id","data_recebimento" DESC);
CREATE INDEX "compras_recebimentos_status_idx" ON "compras_recebimentos"("status");

CREATE TABLE "compras_recebimento_itens" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "recebimento_id" UUID NOT NULL, "pedido_item_id" UUID NOT NULL,
 "quantidade_recebida" DECIMAL(15,4) NOT NULL, "quantidade_avariada" DECIMAL(15,4) NOT NULL DEFAULT 0,
 "quantidade_recusada" DECIMAL(15,4) NOT NULL DEFAULT 0, "divergencia" TEXT, "lote" VARCHAR(100),
 "numero_serie" VARCHAR(255), "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "compras_recebimento_itens_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "compras_recebimento_itens_recebimento_pedido_key" UNIQUE ("recebimento_id","pedido_item_id"),
 CONSTRAINT "compras_recebimento_itens_quantidades_check" CHECK ("quantidade_recebida">0 AND "quantidade_avariada">=0 AND "quantidade_recusada">=0 AND "quantidade_avariada"+"quantidade_recusada"<="quantidade_recebida")
);
CREATE INDEX "compras_recebimento_itens_pedido_item_idx" ON "compras_recebimento_itens"("pedido_item_id");

ALTER TABLE "compras_pedidos" ADD CONSTRAINT "compras_pedidos_fornecedor_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "compras_fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compras_pedido_itens" ADD CONSTRAINT "compras_pedido_itens_pedido_fkey" FOREIGN KEY ("pedido_id") REFERENCES "compras_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compras_pedido_rateios" ADD CONSTRAINT "compras_pedido_rateios_pedido_item_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "compras_pedido_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compras_pedido_rateios" ADD CONSTRAINT "compras_pedido_rateios_proposta_item_fkey" FOREIGN KEY ("compras_proposta_item_id") REFERENCES "compras_proposta_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compras_recebimentos" ADD CONSTRAINT "compras_recebimentos_pedido_fkey" FOREIGN KEY ("pedido_id") REFERENCES "compras_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compras_recebimento_itens" ADD CONSTRAINT "compras_recebimento_itens_recebimento_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "compras_recebimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compras_recebimento_itens" ADD CONSTRAINT "compras_recebimento_itens_pedido_item_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "compras_pedido_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(),v.hub,v.modulo,v.acao,v.descricao,CURRENT_TIMESTAMP FROM (VALUES
 ('COMPRAS','FORNECEDORES','VISUALIZAR','Visualizar fornecedores de Compras'),('COMPRAS','FORNECEDORES','GERENCIAR','Gerenciar fornecedores de Compras'),
 ('COMPRAS','PEDIDOS','VISUALIZAR','Visualizar pedidos de Compras'),('COMPRAS','PEDIDOS','GERENCIAR','Gerenciar pedidos de Compras'),
 ('COMPRAS','RECEBIMENTOS','VISUALIZAR','Visualizar recebimentos de Compras'),('COMPRAS','RECEBIMENTOS','GERENCIAR','Gerenciar recebimentos de Compras')
) AS v(hub,modulo,acao,descricao)
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" p WHERE p.hub=v.hub AND p.modulo=v.modulo AND p.acao=v.acao);

INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT pf.id,pe.id,'PERMITIR'::"EfeitoPermissao",CURRENT_TIMESTAMP FROM "perfis" pf CROSS JOIN "permissoes" pe
WHERE upper(pf.nome)='ADMINISTRADOR' AND pe.hub='COMPRAS' AND pe.modulo IN ('FORNECEDORES','PEDIDOS','RECEBIMENTOS')
AND NOT EXISTS (SELECT 1 FROM "perfis_permissoes" pp WHERE pp.perfil_id=pf.id AND pp.permissao_id=pe.id);
