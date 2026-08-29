BEGIN;

UPDATE op_servicos
SET prioridade = 'Baixa',
    atualizado_em = CURRENT_TIMESTAMP
WHERE status IN ('Concluído', 'Concluída', 'Concluido', 'Concluida')
  AND prioridade IS DISTINCT FROM 'Baixa'
RETURNING id, proposta, cliente, status, prioridade;

COMMIT;