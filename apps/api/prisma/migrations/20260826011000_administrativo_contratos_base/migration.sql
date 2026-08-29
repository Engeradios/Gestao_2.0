-- CreateTable
CREATE TABLE "contratos_administrativos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" VARCHAR(40) NOT NULL,
    "cliente_id" UUID NOT NULL,
    "titulo" VARCHAR(300) NOT NULL,
    "tipo" VARCHAR(100),
    "objeto" TEXT,
    "etapa" VARCHAR(60) NOT NULL DEFAULT 'CADASTRO_INICIAL',
    "status" VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
    "numero_documento" VARCHAR(120),
    "data_assinatura" DATE,
    "vigencia_inicio" DATE,
    "vigencia_fim" DATE,
    "renovacao_automatica" BOOLEAN NOT NULL DEFAULT false,
    "aviso_renovacao_dias" INTEGER,
    "valor_global" DECIMAL(18,2),
    "valor_mensal" DECIMAL(18,2),
    "moeda" CHAR(3) NOT NULL DEFAULT 'BRL',
    "indice_reajuste" VARCHAR(80),
    "data_base_reajuste" DATE,
    "observacoes" TEXT,
    "criado_por_id" UUID NOT NULL,
    "responsavel_id" UUID,
    "atualizado_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluido_em" TIMESTAMP(3),

    CONSTRAINT "contratos_administrativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_propostas" (
    "contrato_id" UUID NOT NULL,
    "proposta_id" INTEGER NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_propostas_pkey" PRIMARY KEY ("contrato_id","proposta_id")
);

-- CreateTable
CREATE TABLE "contratos_andamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contrato_id" UUID NOT NULL,
    "etapa_anterior" VARCHAR(60),
    "etapa_nova" VARCHAR(60) NOT NULL,
    "descricao" TEXT NOT NULL,
    "pendencia" TEXT,
    "prazo" DATE,
    "destinatario" VARCHAR(200),
    "observacao_interna" TEXT,
    "origem" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "usuario_id" UUID NOT NULL,
    "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_andamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_documentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contrato_id" UUID NOT NULL,
    "andamento_id" UUID,
    "tipo" VARCHAR(50) NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "nome_original" VARCHAR(255) NOT NULL,
    "nome_armazenado" VARCHAR(100) NOT NULL,
    "caminho_relativo" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "extensao" VARCHAR(15) NOT NULL,
    "tamanho_bytes" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
    "documento_principal" BOOLEAN NOT NULL DEFAULT false,
    "enviado_por_id" UUID NOT NULL,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "substituido_por_id" UUID,
    "excluido_em" TIMESTAMP(3),
    "excluido_por_id" UUID,

    CONSTRAINT "contratos_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_consultas_cnpj" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contrato_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "cnpj_consultado" VARCHAR(14) NOT NULL,
    "fonte" VARCHAR(30) NOT NULL DEFAULT 'BRASILAPI',
    "http_status" INTEGER,
    "sucesso" BOOLEAN NOT NULL,
    "divergencias" JSONB,
    "resposta" JSONB,
    "erro" TEXT,
    "consultado_por_id" UUID NOT NULL,
    "consultado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_consultas_cnpj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_socios_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consulta_id" UUID NOT NULL,
    "nome_socio" VARCHAR(255),
    "documento_mascarado" VARCHAR(30),
    "qualificacao_socio" VARCHAR(160),
    "data_entrada_sociedade" DATE,
    "faixa_etaria" VARCHAR(80),
    "nome_representante_legal" VARCHAR(255),
    "documento_representante_mascarado" VARCHAR(30),
    "qualificacao_representante" VARCHAR(160),
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contratos_socios_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_administrativos_codigo_key" ON "contratos_administrativos"("codigo");

-- CreateIndex
CREATE INDEX "contratos_administrativos_cliente_id_idx" ON "contratos_administrativos"("cliente_id");

-- CreateIndex
CREATE INDEX "contratos_administrativos_etapa_status_idx" ON "contratos_administrativos"("etapa", "status");

-- CreateIndex
CREATE INDEX "contratos_administrativos_vigencia_fim_idx" ON "contratos_administrativos"("vigencia_fim");

-- CreateIndex
CREATE INDEX "contratos_administrativos_responsavel_id_idx" ON "contratos_administrativos"("responsavel_id");

-- CreateIndex
CREATE INDEX "contratos_propostas_proposta_id_idx" ON "contratos_propostas"("proposta_id");

-- CreateIndex
CREATE INDEX "contratos_andamentos_contrato_id_registrado_em_idx" ON "contratos_andamentos"("contrato_id", "registrado_em");

-- CreateIndex
CREATE INDEX "contratos_andamentos_etapa_nova_idx" ON "contratos_andamentos"("etapa_nova");

-- CreateIndex
CREATE INDEX "contratos_andamentos_prazo_idx" ON "contratos_andamentos"("prazo");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_documentos_caminho_relativo_key" ON "contratos_documentos"("caminho_relativo");

-- CreateIndex
CREATE INDEX "contratos_documentos_contrato_id_status_idx" ON "contratos_documentos"("contrato_id", "status");

-- CreateIndex
CREATE INDEX "contratos_documentos_andamento_id_idx" ON "contratos_documentos"("andamento_id");

-- CreateIndex
CREATE INDEX "contratos_documentos_sha256_idx" ON "contratos_documentos"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_documentos_contrato_id_tipo_versao_key" ON "contratos_documentos"("contrato_id", "tipo", "versao");

-- CreateIndex
CREATE INDEX "contratos_consultas_cnpj_contrato_id_consultado_em_idx" ON "contratos_consultas_cnpj"("contrato_id", "consultado_em");

-- CreateIndex
CREATE INDEX "contratos_consultas_cnpj_cliente_id_idx" ON "contratos_consultas_cnpj"("cliente_id");

-- CreateIndex
CREATE INDEX "contratos_consultas_cnpj_cnpj_consultado_idx" ON "contratos_consultas_cnpj"("cnpj_consultado");

-- CreateIndex
CREATE INDEX "contratos_socios_snapshot_consulta_id_idx" ON "contratos_socios_snapshot"("consulta_id");

-- CreateIndex
CREATE INDEX "contratos_socios_snapshot_nome_socio_idx" ON "contratos_socios_snapshot"("nome_socio");

-- AddForeignKey
ALTER TABLE "contratos_administrativos" ADD CONSTRAINT "contratos_administrativos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_operacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_administrativos" ADD CONSTRAINT "contratos_administrativos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_administrativos" ADD CONSTRAINT "contratos_administrativos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_administrativos" ADD CONSTRAINT "contratos_administrativos_atualizado_por_id_fkey" FOREIGN KEY ("atualizado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_propostas" ADD CONSTRAINT "contratos_propostas_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos_administrativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_propostas" ADD CONSTRAINT "contratos_propostas_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "op_propostas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_andamentos" ADD CONSTRAINT "contratos_andamentos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos_administrativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_andamentos" ADD CONSTRAINT "contratos_andamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_documentos" ADD CONSTRAINT "contratos_documentos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos_administrativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_documentos" ADD CONSTRAINT "contratos_documentos_andamento_id_fkey" FOREIGN KEY ("andamento_id") REFERENCES "contratos_andamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_documentos" ADD CONSTRAINT "contratos_documentos_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_documentos" ADD CONSTRAINT "contratos_documentos_excluido_por_id_fkey" FOREIGN KEY ("excluido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_documentos" ADD CONSTRAINT "contratos_documentos_substituido_por_id_fkey" FOREIGN KEY ("substituido_por_id") REFERENCES "contratos_documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_consultas_cnpj" ADD CONSTRAINT "contratos_consultas_cnpj_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos_administrativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_consultas_cnpj" ADD CONSTRAINT "contratos_consultas_cnpj_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_operacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_consultas_cnpj" ADD CONSTRAINT "contratos_consultas_cnpj_consultado_por_id_fkey" FOREIGN KEY ("consultado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_socios_snapshot" ADD CONSTRAINT "contratos_socios_snapshot_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "contratos_consultas_cnpj"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RBAC administrativo de clientes e contratos.
INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(),v.hub,v.modulo,v.acao,v.descricao,CURRENT_TIMESTAMP
FROM (VALUES
('ADMINISTRATIVO','CLIENTES','VISUALIZAR','Visualizar clientes administrativos'),
('ADMINISTRATIVO','CLIENTES','GERENCIAR','Gerenciar clientes administrativos'),
('ADMINISTRATIVO','CONTRATOS','VISUALIZAR','Visualizar contratos administrativos'),
('ADMINISTRATIVO','CONTRATOS','GERENCIAR','Gerenciar contratos administrativos'),
('ADMINISTRATIVO','CONTRATOS','DOCUMENTOS','Gerenciar documentos dos contratos'),
('ADMINISTRATIVO','CONTRATOS','VALORES','Visualizar e gerenciar valores contratuais')
) AS v(hub,modulo,acao,descricao)
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" p WHERE p."hub"=v.hub AND p."modulo"=v.modulo AND p."acao"=v.acao);

INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT pf."id",pe."id",'PERMITIR',CURRENT_TIMESTAMP
FROM "perfis" pf CROSS JOIN "permissoes" pe
WHERE pf."codigo"='ADMINISTRADOR' AND pe."hub"='ADMINISTRATIVO' AND pe."modulo" IN ('CLIENTES','CONTRATOS')
ON CONFLICT ("perfil_id","permissao_id") DO NOTHING;

