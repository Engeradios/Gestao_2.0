-- AlterTable
ALTER TABLE "rh_funcionarios" ADD COLUMN     "data_nascimento" DATE,
ADD COLUMN     "gestor" VARCHAR(180),
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "salario_centavos" BIGINT,
ADD COLUMN     "telefone" VARCHAR(30),
ADD COLUMN     "tipo_contrato" VARCHAR(40);

-- CreateTable
CREATE TABLE "rh_desligamentos" (
    "id" UUID NOT NULL,
    "funcionario_id" UUID NOT NULL,
    "data_desligamento" DATE NOT NULL,
    "motivo" VARCHAR(180) NOT NULL,
    "iniciativa" VARCHAR(30) NOT NULL,
    "aviso_previo" VARCHAR(30),
    "elegivel_recontratacao" BOOLEAN,
    "setor_snapshot" VARCHAR(120),
    "cargo_snapshot" VARCHAR(120),
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_desligamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rh_desligamentos_funcionario_id_key" ON "rh_desligamentos"("funcionario_id");

-- CreateIndex
CREATE INDEX "rh_desligamentos_data_desligamento_idx" ON "rh_desligamentos"("data_desligamento");

-- CreateIndex
CREATE INDEX "rh_desligamentos_motivo_idx" ON "rh_desligamentos"("motivo");

-- CreateIndex
CREATE INDEX "rh_funcionarios_setor_id_status_idx" ON "rh_funcionarios"("setor_id", "status");

-- CreateIndex
CREATE INDEX "rh_funcionarios_nome_idx" ON "rh_funcionarios"("nome");

-- AddForeignKey
ALTER TABLE "rh_desligamentos" ADD CONSTRAINT "rh_desligamentos_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "rh_funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DP-RH permissoes complementares
WITH novas(hub, modulo, acao, descricao) AS (
  VALUES
    ('DP_RH','FUNCIONARIOS','EDITAR','Editar funcionarios'),
    ('DP_RH','FUNCIONARIOS','DESLIGAR','Registrar desligamentos'),
    ('DP_RH','CADASTROS','VISUALIZAR','Visualizar cadastros auxiliares'),
    ('DP_RH','CADASTROS','GERENCIAR','Gerenciar cadastros auxiliares'),
    ('DP_RH','MOVIMENTACOES','VISUALIZAR','Visualizar movimentacoes'),
    ('DP_RH','MOVIMENTACOES','GERENCIAR','Registrar movimentacoes'),
    ('DP_RH','RELATORIOS','EXPORTAR','Exportar relatorios de DP e RH')
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
ON CONFLICT ("perfil_id","permissao_id") DO UPDATE
SET "efeito" = 'PERMITIR';
