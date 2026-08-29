-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EfeitoPermissao" AS ENUM ('PERMITIR', 'NEGAR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "status" "StatusUsuario" NOT NULL DEFAULT 'ATIVO',
    "unidade" VARCHAR(10),
    "ultimo_login_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(255),
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "id" UUID NOT NULL,
    "hub" VARCHAR(80) NOT NULL,
    "modulo" VARCHAR(80) NOT NULL,
    "acao" VARCHAR(80) NOT NULL,
    "descricao" VARCHAR(255),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_perfis" (
    "usuario_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_perfis_pkey" PRIMARY KEY ("usuario_id","perfil_id")
);

-- CreateTable
CREATE TABLE "perfis_permissoes" (
    "perfil_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,
    "efeito" "EfeitoPermissao" NOT NULL DEFAULT 'PERMITIR',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_permissoes_pkey" PRIMARY KEY ("perfil_id","permissao_id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" UUID,
    "entidade" VARCHAR(100) NOT NULL,
    "entidade_id" VARCHAR(100),
    "acao" VARCHAR(60) NOT NULL,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_status_idx" ON "usuarios"("status");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_codigo_key" ON "perfis"("codigo");

-- CreateIndex
CREATE INDEX "permissoes_hub_modulo_idx" ON "permissoes"("hub", "modulo");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_hub_modulo_acao_key" ON "permissoes"("hub", "modulo", "acao");

-- CreateIndex
CREATE INDEX "usuarios_perfis_perfil_id_idx" ON "usuarios_perfis"("perfil_id");

-- CreateIndex
CREATE INDEX "perfis_permissoes_permissao_id_idx" ON "perfis_permissoes"("permissao_id");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_criado_em_idx" ON "auditoria"("usuario_id", "criado_em");

-- CreateIndex
CREATE INDEX "auditoria_entidade_entidade_id_idx" ON "auditoria"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "auditoria_criado_em_idx" ON "auditoria"("criado_em");

-- AddForeignKey
ALTER TABLE "usuarios_perfis" ADD CONSTRAINT "usuarios_perfis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_perfis" ADD CONSTRAINT "usuarios_perfis_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "perfis_permissoes_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "perfis_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
