-- CreateEnum
CREATE TYPE "RhStatusFuncionario" AS ENUM ('ATIVO', 'AFASTADO', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "RhTipoMovimentacao" AS ENUM ('ADMISSAO', 'ALTERACAO', 'AFASTAMENTO', 'RETORNO', 'DESLIGAMENTO');

-- CreateTable
CREATE TABLE "rh_setores" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_cargos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_unidades" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_funcionarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(180) NOT NULL,
    "cpf" VARCHAR(14),
    "matricula" VARCHAR(40),
    "email" VARCHAR(180),
    "data_admissao" DATE NOT NULL,
    "data_desligamento" DATE,
    "status" "RhStatusFuncionario" NOT NULL DEFAULT 'ATIVO',
    "setor_id" UUID,
    "cargo_id" UUID,
    "unidade_id" UUID,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_movimentacoes" (
    "id" UUID NOT NULL,
    "funcionario_id" UUID NOT NULL,
    "tipo" "RhTipoMovimentacao" NOT NULL,
    "data" DATE NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rh_setores_nome_key" ON "rh_setores"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "rh_cargos_nome_key" ON "rh_cargos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "rh_unidades_nome_key" ON "rh_unidades"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "rh_funcionarios_cpf_key" ON "rh_funcionarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "rh_funcionarios_matricula_key" ON "rh_funcionarios"("matricula");

-- CreateIndex
CREATE INDEX "rh_funcionarios_status_idx" ON "rh_funcionarios"("status");

-- CreateIndex
CREATE INDEX "rh_funcionarios_data_admissao_idx" ON "rh_funcionarios"("data_admissao");

-- CreateIndex
CREATE INDEX "rh_funcionarios_data_desligamento_idx" ON "rh_funcionarios"("data_desligamento");

-- CreateIndex
CREATE INDEX "rh_movimentacoes_funcionario_id_data_idx" ON "rh_movimentacoes"("funcionario_id", "data");

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "rh_setores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "rh_cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "rh_unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_movimentacoes" ADD CONSTRAINT "rh_movimentacoes_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "rh_funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DP-RH RBAC idempotente
WITH novas(hub, modulo, acao, descricao) AS (
  VALUES
    ('DP_RH','DASHBOARD','VISUALIZAR','Visualizar dashboard de DP e RH'),
    ('DP_RH','FUNCIONARIOS','VISUALIZAR','Visualizar funcionarios de DP e RH'),
    ('DP_RH','FUNCIONARIOS','CRIAR','Cadastrar funcionarios de DP e RH')
)
INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(), n.hub, n.modulo, n.acao, n.descricao, CURRENT_TIMESTAMP
FROM novas n
ON CONFLICT ("hub","modulo","acao") DO UPDATE
SET "descricao" = EXCLUDED."descricao";

INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT pf."id", pe."id", 'PERMITIR', CURRENT_TIMESTAMP
FROM "perfis" pf
CROSS JOIN "permissoes" pe
WHERE pf."codigo" = 'ADMINISTRADOR'
  AND pf."ativo" = true
  AND pe."hub" = 'DP_RH'
  AND (pe."modulo", pe."acao") IN (
    ('DASHBOARD','VISUALIZAR'),
    ('FUNCIONARIOS','VISUALIZAR'),
    ('FUNCIONARIOS','CRIAR')
  )
ON CONFLICT ("perfil_id","permissao_id") DO UPDATE
SET "efeito" = 'PERMITIR';
