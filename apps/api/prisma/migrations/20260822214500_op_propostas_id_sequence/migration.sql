DO $$
DECLARE
  proximo bigint;
BEGIN
  LOCK TABLE op_propostas IN ACCESS EXCLUSIVE MODE;

  CREATE SEQUENCE IF NOT EXISTS op_propostas_id_seq;

  SELECT COALESCE(MAX(id), 0) + 1
    INTO proximo
    FROM op_propostas;

  PERFORM setval(
    'op_propostas_id_seq',
    GREATEST(proximo, 1),
    false
  );

  ALTER SEQUENCE op_propostas_id_seq
    OWNED BY op_propostas.id;

  ALTER TABLE op_propostas
    ALTER COLUMN id
    SET DEFAULT nextval('op_propostas_id_seq');
END
$$;
