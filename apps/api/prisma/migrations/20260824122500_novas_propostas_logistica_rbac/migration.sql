WITH novas(hub, modulo, acao, descricao) AS (
  VALUES
    (
      'ESTOQUE_LOGISTICA',
      'NOVAS_PROPOSTAS',
      'VISUALIZAR',
      'Visualizar novas propostas destinadas à logística'
    ),
    (
      'ESTOQUE_LOGISTICA',
      'NOVAS_PROPOSTAS',
      'GERENCIAR',
      'Gerenciar o recebimento de novas propostas pela logística'
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
FROM novas n
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
  ON permissao.hub = 'ESTOQUE_LOGISTICA'
 AND permissao.modulo = 'NOVAS_PROPOSTAS'
 AND permissao.acao IN ('VISUALIZAR', 'GERENCIAR')
WHERE perfil.codigo = 'ADMINISTRADOR'
ON CONFLICT (perfil_id, permissao_id)
DO UPDATE SET efeito = 'PERMITIR';
