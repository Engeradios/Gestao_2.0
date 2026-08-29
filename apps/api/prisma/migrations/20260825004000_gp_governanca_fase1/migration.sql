-- Governança e exclusão lógica de Grandes Projetos.

-- Migration preparatória. Nenhum dado existente é removido.

ALTER TABLE "gp_projeto"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "atualizado_por_id" UUID,
  ADD COLUMN "excluido_em" TIMESTAMP(6),
  ADD COLUMN "excluido_por_id" UUID,
  ADD COLUMN "motivo_exclusao" TEXT;

CREATE INDEX "gp_projeto_excluido_em_idx"
  ON "gp_projeto" ("excluido_em");

ALTER TABLE "gp_custo"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "atualizado_por_id" UUID,
  ADD COLUMN "excluido_em" TIMESTAMP(6),
  ADD COLUMN "excluido_por_id" UUID,
  ADD COLUMN "motivo_exclusao" TEXT;

CREATE INDEX "gp_custo_excluido_em_idx"
  ON "gp_custo" ("excluido_em");

ALTER TABLE "gp_material"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "atualizado_por_id" UUID,
  ADD COLUMN "excluido_em" TIMESTAMP(6),
  ADD COLUMN "excluido_por_id" UUID,
  ADD COLUMN "motivo_exclusao" TEXT;

CREATE INDEX "gp_material_excluido_em_idx"
  ON "gp_material" ("excluido_em");

ALTER TABLE "gp_os"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "atualizado_por_id" UUID,
  ADD COLUMN "excluido_em" TIMESTAMP(6),
  ADD COLUMN "excluido_por_id" UUID,
  ADD COLUMN "motivo_exclusao" TEXT;

CREATE INDEX "gp_os_excluido_em_idx"
  ON "gp_os" ("excluido_em");

ALTER TABLE "gp_marco"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "atualizado_por_id" UUID,
  ADD COLUMN "excluido_em" TIMESTAMP(6),
  ADD COLUMN "excluido_por_id" UUID,
  ADD COLUMN "motivo_exclusao" TEXT;

CREATE INDEX "gp_marco_excluido_em_idx"
  ON "gp_marco" ("excluido_em");

ALTER TABLE "gp_relatorio"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "atualizado_por_id" UUID,
  ADD COLUMN "excluido_em" TIMESTAMP(6),
  ADD COLUMN "excluido_por_id" UUID,
  ADD COLUMN "motivo_exclusao" TEXT;

CREATE INDEX "gp_relatorio_excluido_em_idx"
  ON "gp_relatorio" ("excluido_em");

ALTER TABLE "gp_relatorio_foto"
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "atualizado_por_id" UUID,
  ADD COLUMN "excluido_em" TIMESTAMP(6),
  ADD COLUMN "excluido_por_id" UUID,
  ADD COLUMN "motivo_exclusao" TEXT;

CREATE INDEX "gp_relatorio_foto_excluido_em_idx"
  ON "gp_relatorio_foto" ("excluido_em");

ALTER TABLE "gp_projeto"
  ADD COLUMN "aprovacao_status" VARCHAR(30)
    NOT NULL DEFAULT 'NAO_SUBMETIDO',
  ADD COLUMN "aprovado_em" TIMESTAMP(6),
  ADD COLUMN "aprovado_por_id" UUID,
  ADD CONSTRAINT "gp_projeto_aprovacao_status_ck"
    CHECK (
      "aprovacao_status" IN (
        'NAO_SUBMETIDO',
        'PENDENTE',
        'APROVADO',
        'REJEITADO'
      )
    );

INSERT INTO "permissoes"
  ("id", "hub", "modulo", "acao", "descricao", "criado_em")
VALUES
  (
    gen_random_uuid(),
    'GRANDES_PROJETOS',
    'PROJETOS',
    'RESTAURAR',
    'Restaurar projetos excluídos',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'GRANDES_PROJETOS',
    'PROJETOS',
    'APROVAR',
    'Aprovar alterações de projetos',
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("hub", "modulo", "acao") DO NOTHING;

INSERT INTO "perfis_permissoes"
  ("perfil_id", "permissao_id", "efeito", "criado_em")
SELECT
  pf."id",
  pe."id",
  'PERMITIR',
  CURRENT_TIMESTAMP
FROM "perfis" pf
CROSS JOIN "permissoes" pe
WHERE pf."codigo" = 'ADMINISTRADOR'
  AND pe."hub" = 'GRANDES_PROJETOS'
  AND pe."modulo" = 'PROJETOS'
  AND pe."acao" IN ('RESTAURAR', 'APROVAR')
ON CONFLICT ("perfil_id", "permissao_id") DO NOTHING;
