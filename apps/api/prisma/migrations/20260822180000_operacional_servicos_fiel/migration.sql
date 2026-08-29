CREATE TABLE "op_clientes" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "codigo" INTEGER, "razao_social" VARCHAR(220) NOT NULL,
 "nome_fantasia" VARCHAR(220), "cnpj" VARCHAR(30), "endereco" TEXT, "bairro" VARCHAR(120),
 "municipio" VARCHAR(120), "uf" VARCHAR(2), "cep" VARCHAR(20), "contato_nome" VARCHAR(160),
 "contato_email" VARCHAR(180), "contato_fone" VARCHAR(60), "website" VARCHAR(255), "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
 "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "op_clientes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "op_clientes_codigo_key" ON "op_clientes"("codigo") WHERE "codigo" IS NOT NULL;
CREATE INDEX "op_clientes_razao_social_idx" ON "op_clientes"("razao_social");
CREATE INDEX "op_clientes_uf_idx" ON "op_clientes"("uf");

CREATE TABLE "op_servicos" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "legado_id" INTEGER, "proposta" VARCHAR(100), "cliente_id" UUID,
 "cliente" VARCHAR(220) NOT NULL, "cliente_local" VARCHAR(220), "data_aprovacao" DATE,
 "dias_preparacao" INTEGER NOT NULL DEFAULT 15, "tempo_execucao_dias" INTEGER, "tipo_proposta" VARCHAR(100),
 "uf_execucao" VARCHAR(2) NOT NULL DEFAULT 'RJ', "servico_atividade" TEXT NOT NULL, "categoria" VARCHAR(100),
 "responsavel" VARCHAR(160), "prioridade" VARCHAR(60), "inicio_planejado" DATE, "prazo_final" DATE,
 "inicio_real" DATE, "conclusao_real" DATE, "status" VARCHAR(80) NOT NULL DEFAULT 'Não iniciado',
 "percentual" DECIMAL(5,4) NOT NULL DEFAULT 0, "proxima_acao" TEXT, "ultima_situacao" TEXT, "observacoes" TEXT,
 "proposta_pdf" VARCHAR(255), "proposta_pdf_nome" VARCHAR(255), "proposta_pdf_em" TIMESTAMP(3),
 "aberto_em" TIMESTAMP(3), "notificado_em" TIMESTAMP(3), "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "op_servicos_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "op_servicos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "op_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "op_servicos_percentual_check" CHECK ("percentual" >= 0 AND "percentual" <= 1)
);
CREATE UNIQUE INDEX "op_servicos_legado_id_key" ON "op_servicos"("legado_id") WHERE "legado_id" IS NOT NULL;
CREATE UNIQUE INDEX "op_servicos_proposta_normalizada_key" ON "op_servicos"(lower(trim("proposta"))) WHERE "proposta" IS NOT NULL AND trim("proposta") <> '';
CREATE INDEX "op_servicos_cliente_id_idx" ON "op_servicos"("cliente_id");
CREATE INDEX "op_servicos_status_idx" ON "op_servicos"("status");
CREATE INDEX "op_servicos_prazo_final_idx" ON "op_servicos"("prazo_final");
CREATE INDEX "op_servicos_responsavel_idx" ON "op_servicos"("responsavel");
CREATE INDEX "op_servicos_uf_execucao_idx" ON "op_servicos"("uf_execucao");

CREATE TABLE "op_servico_andamentos" (
 "id" BIGSERIAL NOT NULL, "servico_id" UUID NOT NULL, "usuario" VARCHAR(160) NOT NULL,
 "descricao" TEXT NOT NULL, "percentual" DECIMAL(5,4), "status_no_momento" VARCHAR(80),
 "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "op_servico_andamentos_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "op_servico_andamentos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "op_servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "op_servico_andamentos_servico_id_registrado_em_idx" ON "op_servico_andamentos"("servico_id","registrado_em");

CREATE TABLE "op_servico_historicos" (
 "id" BIGSERIAL NOT NULL, "servico_id" UUID NOT NULL, "usuario" VARCHAR(160) NOT NULL,
 "campo" VARCHAR(120) NOT NULL, "valor_antigo" TEXT, "valor_novo" TEXT, "situacao" VARCHAR(80),
 "dias_restantes" INTEGER, "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "op_servico_historicos_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "op_servico_historicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "op_servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "op_servico_historicos_servico_id_registrado_em_idx" ON "op_servico_historicos"("servico_id","registrado_em");

CREATE TABLE "op_listas" (
 "id" BIGSERIAL NOT NULL, "tipo" VARCHAR(40) NOT NULL, "nome" VARCHAR(160) NOT NULL, "ordem" INTEGER NOT NULL DEFAULT 0,
 "cor" VARCHAR(7), "unidade" VARCHAR(2), "funcao" VARCHAR(60), "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
 "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "op_listas_pkey" PRIMARY KEY ("id"), CONSTRAINT "op_listas_tipo_nome_key" UNIQUE ("tipo","nome")
);
CREATE INDEX "op_listas_tipo_ordem_nome_idx" ON "op_listas"("tipo","ordem","nome");

CREATE TABLE "op_feriados" (
 "id" BIGSERIAL NOT NULL, "dia" DATE NOT NULL, "uf" VARCHAR(2), "descricao" VARCHAR(160),
 CONSTRAINT "op_feriados_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "op_feriados_dia_uf_key" ON "op_feriados"("dia",COALESCE("uf",''));

CREATE TABLE "op_notificacao_emails" (
 "id" BIGSERIAL NOT NULL, "nome" VARCHAR(160), "email" VARCHAR(180) NOT NULL,
 "rec_abertura" BOOLEAN NOT NULL DEFAULT FALSE, "rec_faturamento" BOOLEAN NOT NULL DEFAULT FALSE,
 "rec_logistica" BOOLEAN NOT NULL DEFAULT FALSE, "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
 "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "op_notificacao_emails_pkey" PRIMARY KEY ("id"), CONSTRAINT "op_notificacao_emails_email_key" UNIQUE ("email")
);

CREATE TABLE "op_email_logs" (
 "id" BIGSERIAL NOT NULL, "servico_id" UUID, "tipo" VARCHAR(40) NOT NULL, "assunto" VARCHAR(255) NOT NULL,
 "destinatarios" TEXT NOT NULL, "qtd_dest" INTEGER NOT NULL DEFAULT 0, "sucesso" BOOLEAN NOT NULL,
 "detalhe" VARCHAR(1000), "com_anexo" BOOLEAN NOT NULL DEFAULT FALSE, "usuario" VARCHAR(160) NOT NULL,
 "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "op_email_logs_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "op_email_logs_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "op_servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "op_email_logs_enviado_em_idx" ON "op_email_logs"("enviado_em");
CREATE INDEX "op_email_logs_servico_id_idx" ON "op_email_logs"("servico_id");

INSERT INTO "op_listas" ("tipo","nome","ordem","cor") VALUES
 ('status','Não iniciado',10,'#64748b'),('status','Em andamento',20,'#2563eb'),('status','Aguardando Cliente',30,'#f59e0b'),
 ('status','Concluído',40,'#0f9d58'),('status','Cancelado',50,'#c8102e'),
 ('prioridade','Baixa',10,NULL),('prioridade','Normal',20,NULL),('prioridade','Alta',30,NULL),('prioridade','Urgente',40,NULL)
ON CONFLICT ("tipo","nome") DO NOTHING;
