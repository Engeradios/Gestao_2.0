-- ===========================================================================
-- Modulo Geolocalizacao — base
-- 1) Colunas de endereco na telemetria (reverse geocode enviado pelo mobile)
-- 2) Permissao OPERACIONAL.GEOLOCALIZACAO.VISUALIZAR para todos os perfis
-- Idempotente: IF NOT EXISTS / WHERE NOT EXISTS
-- ===========================================================================

-- 1) Endereco -------------------------------------------------------------
ALTER TABLE app_campo_telemetria
  ADD COLUMN IF NOT EXISTS endereco_logradouro VARCHAR(200),
  ADD COLUMN IF NOT EXISTS endereco_numero     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS endereco_bairro     VARCHAR(120),
  ADD COLUMN IF NOT EXISTS endereco_cidade     VARCHAR(120),
  ADD COLUMN IF NOT EXISTS endereco_uf         VARCHAR(2),
  ADD COLUMN IF NOT EXISTS endereco_completo   VARCHAR(400);

-- 2) Permissao ------------------------------------------------------------
-- CONSOLIDADO (opcao B): permissao redundante removida em 29/08/2026.
-- O modulo usa APP_CAMPO.LOCALIZACAO.VISUALIZAR (Administrador, Supervisor).
-- INSERT INTO permissoes (id, hub, modulo, acao, descricao, criado_em)
-- SELECT gen_random_uuid(), 'OPERACIONAL', 'GEOLOCALIZACAO', 'VISUALIZAR',
--        'Visualizar mapa de geolocalizacao da equipe em campo', now()
-- WHERE NOT EXISTS (
--   SELECT 1 FROM permissoes
--   WHERE hub='OPERACIONAL' AND modulo='GEOLOCALIZACAO' AND acao='VISUALIZAR'
-- );

-- 3) Vinculo com TODOS os perfis (decisao: todos com acesso web) ----------
-- INSERT INTO perfis_permissoes (perfil_id, permissao_id)
-- SELECT pf.id, pm.id
-- FROM perfis pf
-- CROSS JOIN permissoes pm
-- WHERE pm.hub='OPERACIONAL' AND pm.modulo='GEOLOCALIZACAO' AND pm.acao='VISUALIZAR'
--   AND NOT EXISTS (
--     SELECT 1 FROM perfis_permissoes pp
--     WHERE pp.perfil_id = pf.id AND pp.permissao_id = pm.id
--   );
