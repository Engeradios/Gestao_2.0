CREATE TABLE IF NOT EXISTS op_notificacao_responsabilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  uf VARCHAR(2) NOT NULL,
  praca VARCHAR(160),
  area_responsavel VARCHAR(20) NOT NULL,
  rec_abertura BOOLEAN NOT NULL DEFAULT false,
  rec_conclusao BOOLEAN NOT NULL DEFAULT false,
  rec_logistica BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT op_not_resp_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT op_not_resp_uf_ck CHECK (uf ~ '^[A-Z]{2}$'),
  CONSTRAINT op_not_resp_area_ck CHECK (area_responsavel IN ('OPERACIONAL','LOGISTICA','AMBAS')),
  CONSTRAINT op_not_resp_evento_ck CHECK (rec_abertura OR rec_conclusao OR rec_logistica)
);
CREATE UNIQUE INDEX IF NOT EXISTS op_not_resp_sem_praca_uq
  ON op_notificacao_responsabilidades(usuario_id,uf,area_responsavel)
  WHERE praca IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS op_not_resp_com_praca_uq
  ON op_notificacao_responsabilidades(usuario_id,uf,lower(btrim(praca)),area_responsavel)
  WHERE praca IS NOT NULL;
CREATE INDEX IF NOT EXISTS op_not_resp_roteamento_idx
  ON op_notificacao_responsabilidades(uf,area_responsavel,ativo);
CREATE INDEX IF NOT EXISTS op_not_resp_usuario_idx
  ON op_notificacao_responsabilidades(usuario_id,ativo);

INSERT INTO permissoes (id,hub,modulo,acao,descricao,criado_em)
SELECT gen_random_uuid(),'OPERACIONAL','NOTIFICACOES_OBRA','GERENCIAR_RESPONSABILIDADES',
       'Gerenciar responsáveis por UF, praça e área para notificações de obra',CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM permissoes
  WHERE hub='OPERACIONAL' AND modulo='NOTIFICACOES_OBRA' AND acao='GERENCIAR_RESPONSABILIDADES'
);
INSERT INTO perfis_permissoes (perfil_id,permissao_id,efeito,criado_em)
SELECT pf.id,pe.id,'PERMITIR'::"EfeitoPermissao",CURRENT_TIMESTAMP
FROM perfis pf CROSS JOIN permissoes pe
WHERE (upper(pf.codigo) IN ('ADMIN','ADMINISTRADOR') OR upper(pf.nome)='ADMINISTRADOR')
  AND pe.hub='OPERACIONAL' AND pe.modulo='NOTIFICACOES_OBRA'
  AND pe.acao='GERENCIAR_RESPONSABILIDADES'
  AND NOT EXISTS (
    SELECT 1 FROM perfis_permissoes pp
    WHERE pp.perfil_id=pf.id AND pp.permissao_id=pe.id
  );
