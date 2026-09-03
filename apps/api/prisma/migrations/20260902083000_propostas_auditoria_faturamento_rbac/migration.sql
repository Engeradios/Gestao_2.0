INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em")
SELECT gen_random_uuid(),'PROPOSTAS','AUDITORIA_FATURAMENTO','VISUALIZAR','Visualizar auditoria de faturamento de propostas',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "hub"='PROPOSTAS' AND "modulo"='AUDITORIA_FATURAMENTO' AND "acao"='VISUALIZAR');
INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT pf."id",pe."id",'PERMITIR'::"EfeitoPermissao",CURRENT_TIMESTAMP
FROM "perfis" pf CROSS JOIN "permissoes" pe
WHERE (upper(pf."codigo") IN ('ADMIN','ADMINISTRADOR') OR upper(pf."nome")='ADMINISTRADOR')
  AND pe."hub"='PROPOSTAS' AND pe."modulo"='AUDITORIA_FATURAMENTO' AND pe."acao"='VISUALIZAR'
  AND NOT EXISTS (SELECT 1 FROM "perfis_permissoes" pp WHERE pp."perfil_id"=pf."id" AND pp."permissao_id"=pe."id");
