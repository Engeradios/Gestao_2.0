CREATE TABLE IF NOT EXISTS "op_propostas_auditoria_faturamento_revisoes" (
  "id" BIGSERIAL PRIMARY KEY,
  "proposta_id" INTEGER NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO',
  "observacao" VARCHAR(1000),
  "confirmado_por_id" UUID,
  "confirmado_por_nome" VARCHAR(160),
  "confirmado_em" TIMESTAMP(3),
  "reaberto_por_id" UUID,
  "reaberto_por_nome" VARCHAR(160),
  "reaberto_em" TIMESTAMP(3),
  "classificacao_snapshot" VARCHAR(80),
  "valor_proposta_snapshot" DECIMAL(18,2),
  "valor_pedidos_snapshot" DECIMAL(18,2),
  "valor_emitido_snapshot" DECIMAL(18,2),
  "quantidade_pedidos_snapshot" INTEGER,
  "quantidade_titulos_snapshot" INTEGER,
  "data_aprovacao_snapshot" DATE,
  "data_conclusao_snapshot" DATE,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "op_prop_aud_fat_rev_proposta_uq" UNIQUE ("proposta_id"),
  CONSTRAINT "op_prop_aud_fat_rev_status_ck" CHECK ("status" IN ('AGUARDANDO','CONFIRMADO','REABERTO')),
  CONSTRAINT "op_prop_aud_fat_rev_proposta_fk" FOREIGN KEY ("proposta_id") REFERENCES "op_propostas"("id") ON DELETE CASCADE,
  CONSTRAINT "op_prop_aud_fat_rev_confirmado_fk" FOREIGN KEY ("confirmado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL,
  CONSTRAINT "op_prop_aud_fat_rev_reaberto_fk" FOREIGN KEY ("reaberto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "op_prop_aud_fat_rev_status_idx" ON "op_propostas_auditoria_faturamento_revisoes"("status","atualizado_em" DESC);
CREATE INDEX IF NOT EXISTS "op_prop_aud_fat_rev_confirmado_idx" ON "op_propostas_auditoria_faturamento_revisoes"("confirmado_em" DESC);
INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(),'PROPOSTAS','AUDITORIA_FATURAMENTO','CONFIRMAR','Confirmar ou reabrir revisão de faturamento',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "hub"='PROPOSTAS' AND "modulo"='AUDITORIA_FATURAMENTO' AND "acao"='CONFIRMAR');
INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT pf.id,pe.id,'PERMITIR'::"EfeitoPermissao",CURRENT_TIMESTAMP FROM "perfis" pf CROSS JOIN "permissoes" pe
WHERE (upper(pf.codigo) IN ('ADMIN','ADMINISTRADOR') OR upper(pf.nome)='ADMINISTRADOR')
 AND pe.hub='PROPOSTAS' AND pe.modulo='AUDITORIA_FATURAMENTO' AND pe.acao='CONFIRMAR'
 AND NOT EXISTS (SELECT 1 FROM "perfis_permissoes" pp WHERE pp.perfil_id=pf.id AND pp.permissao_id=pe.id);
