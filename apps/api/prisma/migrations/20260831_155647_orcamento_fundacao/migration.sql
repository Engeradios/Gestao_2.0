BEGIN;

CREATE TYPE "OrcStatus" AS ENUM ('RASCUNHO', 'EM_PREENCHIMENTO', 'ENVIADO_ANALISE', 'EM_ANALISE', 'DEVOLVIDO_CORRECAO', 'ACEITO', 'RECUSADO', 'AGUARDANDO_PROPOSTA', 'PROPOSTA_VINCULADA', 'CANCELADO');

CREATE TYPE "OrcTipoPergunta" AS ENUM ('TEXTO', 'TEXTO_LONGO', 'NUMERO', 'DECIMAL', 'BOOLEANO', 'SELECAO_UNICA', 'SELECAO_MULTIPLA', 'FOTO', 'MEDIDA');

CREATE TYPE "OrcTipoItem" AS ENUM ('EQUIPAMENTO', 'MATERIAL', 'INFRAESTRUTURA', 'SERVICO', 'OUTRO');

CREATE TABLE "orc_checklist_modelos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orc_checklist_modelos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_checklist_grupos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelo_id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "orc_checklist_grupos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_checklist_perguntas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grupo_id" UUID NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "titulo" VARCHAR(300) NOT NULL,
    "ajuda" TEXT,
    "tipo" "OrcTipoPergunta" NOT NULL,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "orc_checklist_perguntas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_checklist_opcoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pergunta_id" UUID NOT NULL,
    "valor" VARCHAR(120) NOT NULL,
    "rotulo" VARCHAR(200) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "orc_checklist_opcoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_regras_condicionais" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pergunta_origem_id" UUID NOT NULL,
    "pergunta_destino_codigo" VARCHAR(100) NOT NULL,
    "operador" VARCHAR(30) NOT NULL,
    "valor" JSONB NOT NULL,
    "acao" VARCHAR(30) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "orc_regras_condicionais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_materiais_basicos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" VARCHAR(60) NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "foto_caminho" VARCHAR(500),
    "unidade" VARCHAR(20) NOT NULL,
    "tipo" "OrcTipoItem" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orc_materiais_basicos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_pergunta_materiais" (
    "pergunta_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "condicao" JSONB,
    "quantidade_formula" VARCHAR(300),

    CONSTRAINT "orc_pergunta_materiais_pkey" PRIMARY KEY ("pergunta_id","material_id")
);

CREATE TABLE "orc_orcamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "numero" VARCHAR(30) NOT NULL,
    "status" "OrcStatus" NOT NULL DEFAULT 'RASCUNHO',
    "titulo" VARCHAR(300),
    "cliente_id" UUID NOT NULL,
    "tecnico_id" UUID NOT NULL,
    "checklist_modelo_id" UUID,
    "proposta_id" INTEGER,
    "proposta_numero" VARCHAR(100),
    "motivo_recusa" TEXT,
    "observacao_analise" TEXT,
    "enviado_em" TIMESTAMP(3),
    "analisado_em" TIMESTAMP(3),
    "analisado_por_id" UUID,
    "proposta_vinculada_em" TIMESTAMP(3),
    "proposta_vinculada_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orc_orcamentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_orcamento_respostas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orcamento_id" UUID NOT NULL,
    "pergunta_id" UUID NOT NULL,
    "valor" JSONB NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orc_orcamento_respostas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_orcamento_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orcamento_id" UUID NOT NULL,
    "material_id" UUID,
    "tipo" "OrcTipoItem" NOT NULL,
    "descricao" VARCHAR(300) NOT NULL,
    "unidade" VARCHAR(20) NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "origem" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "orc_orcamento_itens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_orcamento_evidencias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orcamento_id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "caminho" VARCHAR(500) NOT NULL,
    "nome_original" VARCHAR(255),
    "mime" VARCHAR(100),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orc_orcamento_evidencias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orc_orcamento_historicos" (
    "id" BIGSERIAL NOT NULL,
    "orcamento_id" UUID NOT NULL,
    "usuario_id" UUID,
    "acao" VARCHAR(60) NOT NULL,
    "status_anterior" "OrcStatus",
    "status_novo" "OrcStatus",
    "observacao" TEXT,
    "dados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orc_orcamento_historicos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "orc_checklist_modelos_ativo_nome_idx" ON "orc_checklist_modelos"("ativo", "nome");

CREATE INDEX "orc_checklist_grupos_modelo_id_ordem_idx" ON "orc_checklist_grupos"("modelo_id", "ordem");

CREATE UNIQUE INDEX "orc_checklist_perguntas_codigo_key" ON "orc_checklist_perguntas"("codigo");

CREATE INDEX "orc_checklist_perguntas_grupo_id_ordem_idx" ON "orc_checklist_perguntas"("grupo_id", "ordem");

CREATE UNIQUE INDEX "orc_checklist_opcoes_pergunta_id_valor_key" ON "orc_checklist_opcoes"("pergunta_id", "valor");

CREATE INDEX "orc_regras_condicionais_pergunta_origem_id_ativa_idx" ON "orc_regras_condicionais"("pergunta_origem_id", "ativa");

CREATE UNIQUE INDEX "orc_materiais_basicos_codigo_key" ON "orc_materiais_basicos"("codigo");

CREATE INDEX "orc_materiais_basicos_tipo_ativo_idx" ON "orc_materiais_basicos"("tipo", "ativo");

CREATE UNIQUE INDEX "orc_orcamentos_numero_key" ON "orc_orcamentos"("numero");

CREATE UNIQUE INDEX "orc_orcamentos_proposta_id_key" ON "orc_orcamentos"("proposta_id");

CREATE UNIQUE INDEX "orc_orcamentos_proposta_numero_key" ON "orc_orcamentos"("proposta_numero");

CREATE INDEX "orc_orcamentos_status_criado_em_idx" ON "orc_orcamentos"("status", "criado_em" DESC);

CREATE INDEX "orc_orcamentos_cliente_id_criado_em_idx" ON "orc_orcamentos"("cliente_id", "criado_em" DESC);

CREATE UNIQUE INDEX "orc_orcamento_respostas_orcamento_id_pergunta_id_key" ON "orc_orcamento_respostas"("orcamento_id", "pergunta_id");

CREATE INDEX "orc_orcamento_itens_orcamento_id_tipo_idx" ON "orc_orcamento_itens"("orcamento_id", "tipo");

CREATE INDEX "orc_orcamento_evidencias_orcamento_id_criado_em_idx" ON "orc_orcamento_evidencias"("orcamento_id", "criado_em");

CREATE INDEX "orc_orcamento_historicos_orcamento_id_criado_em_idx" ON "orc_orcamento_historicos"("orcamento_id", "criado_em" DESC);

ALTER TABLE "orc_checklist_grupos" ADD CONSTRAINT "orc_checklist_grupos_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "orc_checklist_modelos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_checklist_perguntas" ADD CONSTRAINT "orc_checklist_perguntas_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "orc_checklist_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_checklist_opcoes" ADD CONSTRAINT "orc_checklist_opcoes_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "orc_checklist_perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_regras_condicionais" ADD CONSTRAINT "orc_regras_condicionais_pergunta_origem_id_fkey" FOREIGN KEY ("pergunta_origem_id") REFERENCES "orc_checklist_perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_pergunta_materiais" ADD CONSTRAINT "orc_pergunta_materiais_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "orc_checklist_perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_pergunta_materiais" ADD CONSTRAINT "orc_pergunta_materiais_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "orc_materiais_basicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orc_orcamentos" ADD CONSTRAINT "orc_orcamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_operacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orc_orcamentos" ADD CONSTRAINT "orc_orcamentos_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orc_orcamentos" ADD CONSTRAINT "orc_orcamentos_analisado_por_id_fkey" FOREIGN KEY ("analisado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orc_orcamentos" ADD CONSTRAINT "orc_orcamentos_proposta_vinculada_por_id_fkey" FOREIGN KEY ("proposta_vinculada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orc_orcamentos" ADD CONSTRAINT "orc_orcamentos_checklist_modelo_id_fkey" FOREIGN KEY ("checklist_modelo_id") REFERENCES "orc_checklist_modelos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orc_orcamentos" ADD CONSTRAINT "orc_orcamentos_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "op_propostas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orc_orcamento_respostas" ADD CONSTRAINT "orc_orcamento_respostas_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orc_orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_orcamento_respostas" ADD CONSTRAINT "orc_orcamento_respostas_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "orc_checklist_perguntas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orc_orcamento_itens" ADD CONSTRAINT "orc_orcamento_itens_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orc_orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_orcamento_itens" ADD CONSTRAINT "orc_orcamento_itens_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "orc_materiais_basicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orc_orcamento_evidencias" ADD CONSTRAINT "orc_orcamento_evidencias_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orc_orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_orcamento_historicos" ADD CONSTRAINT "orc_orcamento_historicos_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orc_orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orc_orcamento_historicos" ADD CONSTRAINT "orc_orcamento_historicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
