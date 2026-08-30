-- Indices para telemetria de alta frequencia (captura a cada 60s)
-- Todos com IF NOT EXISTS: reexecucao segura.

-- 1) FKs sem indice apontadas na auditoria
CREATE INDEX IF NOT EXISTS idx_telemetria_dispositivo
  ON app_campo_telemetria (dispositivo_id);

CREATE INDEX IF NOT EXISTS idx_expedientes_dispositivo
  ON app_campo_expedientes (dispositivo_id);

CREATE INDEX IF NOT EXISTS idx_termos_aceites_dispositivo
  ON app_campo_termos_aceites (dispositivo_id);

CREATE INDEX IF NOT EXISTS idx_eventos_offline_dispositivo
  ON app_campo_eventos_offline (dispositivo_id);

CREATE INDEX IF NOT EXISTS idx_acessos_localizacao_expediente
  ON app_campo_acessos_localizacao (expediente_id);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente
  ON ordens_servico (cliente_id);

-- 2) Consulta principal do mapa: ultimos pontos por expediente
-- REMOVIDO (duplicado): CREATE INDEX IF NOT EXISTS idx_telemetria_expediente_capturado
-- REMOVIDO (duplicado):   ON app_campo_telemetria (expediente_id, capturado_em DESC);

-- 3) Historico por usuario (relatorios e trilha do funcionario)
-- REMOVIDO (duplicado): CREATE INDEX IF NOT EXISTS idx_telemetria_usuario_capturado
-- REMOVIDO (duplicado):   ON app_campo_telemetria (usuario_id, capturado_em DESC);

-- 4) Rotina de anonimizacao LGPD: varre apenas os nao anonimizados
-- REMOVIDO (duplicado): CREATE INDEX IF NOT EXISTS idx_telemetria_anonimizacao
-- REMOVIDO (duplicado):   ON app_campo_telemetria (capturado_em)
-- REMOVIDO (duplicado):   WHERE anonimizado_em IS NULL;

-- 5) Janela temporal recente (mapa "onde a equipe esta agora")
CREATE INDEX IF NOT EXISTS idx_telemetria_capturado_em
  ON app_campo_telemetria (capturado_em DESC);
