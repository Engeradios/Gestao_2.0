WITH nova(hub, modulo, acao, descricao) AS (
  VALUES (
    'OPERACIONAL',
    'OS',
    'EDITAR_DADOS',
    'Editar dados administrativos dos serviços operacionais'
  )
)
INSERT INTO permissoes (
  id,
  hub,
  modulo,
  acao,
  descricao,
  criado_em
)
SELECT
  gen_random_uuid(),
  n.hub,
  n.modulo,
  n.acao,
  n.descricao,
  CURRENT_TIMESTAMP
FROM nova n
WHERE NOT EXISTS (
  SELECT 1
  FROM permissoes p
  WHERE p.hub = n.hub
    AND p.modulo = n.modulo
    AND p.acao = n.acao
);

INSERT INTO perfis_permissoes (
  perfil_id,
  permissao_id,
  efeito,
  criado_em
)
SELECT
  perfil.id,
  permissao.id,
  'PERMITIR',
  CURRENT_TIMESTAMP
FROM perfis perfil
JOIN permissoes permissao
  ON permissao.hub = 'OPERACIONAL'
 AND permissao.modulo = 'OS'
 AND permissao.acao = 'EDITAR_DADOS'
WHERE perfil.codigo = 'ADMINISTRADOR'
  AND NOT EXISTS (
    SELECT 1
    FROM perfis_permissoes pp
    WHERE pp.perfil_id = perfil.id
      AND pp.permissao_id = permissao.id
  );
