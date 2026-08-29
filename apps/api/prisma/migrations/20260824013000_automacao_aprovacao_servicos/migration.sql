CREATE OR REPLACE FUNCTION op_somar_dias_uteis(
  data_base date,
  quantidade integer,
  uf_referencia varchar DEFAULT NULL
)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resultado date := data_base;
  adicionados integer := 0;
BEGIN
  IF data_base IS NULL THEN
    RETURN NULL;
  END IF;

  IF COALESCE(quantidade, 0) <= 0 THEN
    RETURN data_base;
  END IF;

  WHILE adicionados < quantidade LOOP
    resultado := resultado + 1;

    IF EXTRACT(ISODOW FROM resultado) BETWEEN 1 AND 5
       AND NOT EXISTS (
         SELECT 1
         FROM op_feriados f
         WHERE f.dia = resultado
           AND (
             f.uf IS NULL
             OR trim(f.uf) = ''
             OR upper(trim(f.uf)) =
                upper(trim(COALESCE(uf_referencia, '')))
           )
       )
    THEN
      adicionados := adicionados + 1;
    END IF;
  END LOOP;

  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION op_planejar_datas_servico()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.dias_preparacao :=
    GREATEST(COALESCE(NEW.dias_preparacao, 15), 0);

  IF TG_OP = 'INSERT'
     OR NEW.dias_preparacao IS DISTINCT FROM OLD.dias_preparacao
     OR NEW.data_aprovacao IS DISTINCT FROM OLD.data_aprovacao
     OR NEW.uf_execucao IS DISTINCT FROM OLD.uf_execucao
  THEN
    NEW.inicio_planejado := op_somar_dias_uteis(
      COALESCE(NEW.data_aprovacao, CURRENT_DATE),
      NEW.dias_preparacao,
      NEW.uf_execucao
    );
  END IF;

  IF NEW.tempo_execucao_dias IS NOT NULL THEN
    NEW.tempo_execucao_dias :=
      GREATEST(NEW.tempo_execucao_dias, 0);

    NEW.prazo_final := op_somar_dias_uteis(
      NEW.inicio_planejado,
      NEW.tempo_execucao_dias,
      NEW.uf_execucao
    );
  ELSE
    NEW.prazo_final := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS op_servicos_planejar_datas
  ON op_servicos;

CREATE TRIGGER op_servicos_planejar_datas
BEFORE INSERT OR UPDATE OF
  dias_preparacao,
  tempo_execucao_dias,
  data_aprovacao,
  uf_execucao
ON op_servicos
FOR EACH ROW
EXECUTE FUNCTION op_planejar_datas_servico();

CREATE OR REPLACE FUNCTION op_criar_servico_proposta_aprovada()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  servico_criado uuid;
  data_aprovacao_calculada date;
  pedido_encontrado varchar(100);
BEGIN
  IF upper(trim(COALESCE(NEW.status, ''))) <> 'APROVADO' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND upper(trim(COALESCE(OLD.status, ''))) = 'APROVADO'
  THEN
    RETURN NEW;
  END IF;

  data_aprovacao_calculada :=
    COALESCE(NEW.atualizado_em::date, CURRENT_DATE);

  SELECT pv.pedido
  INTO pedido_encontrado
  FROM fin_pedidos_venda pv
  WHERE trim(pv.seu_pedido) = trim(NEW.numero)
    AND pv.pedido IS NOT NULL
    AND trim(pv.pedido) <> ''
  ORDER BY
    pv.data_pedido DESC NULLS LAST,
    pv.id DESC
  LIMIT 1;

  INSERT INTO op_servicos (
    proposta_id,
    proposta,
    cliente,
    cliente_local,
    data_aprovacao,
    dias_preparacao,
    tempo_execucao_dias,
    tipo_proposta,
    uf_execucao,
    servico_atividade,
    prioridade,
    status,
    status_base,
    percentual,
    contrato,
    pedido,
    contato_nome,
    contato_email,
    contato_telefone,
    endereco_instalacao,
    titulo,
    ativo,
    email_abertura_status,
    email_conclusao_status,
    criado_em,
    atualizado_em
  )
  VALUES (
    NEW.id,
    NEW.numero,
    COALESCE(NULLIF(trim(NEW.cliente_nome), ''), 'Cliente não informado'),
    COALESCE(
      NULLIF(trim(NEW.local), ''),
      NULLIF(trim(NEW.endereco_instalacao), '')
    ),
    data_aprovacao_calculada,
    15,
    NULL,
    NEW.tipo,
    COALESCE(NULLIF(trim(NEW.cliente_uf), ''), 'RJ'),
    COALESCE(
      NULLIF(trim(NEW.titulo), ''),
      NULLIF(trim(NEW.tipo), ''),
      'Serviço originado da proposta ' || NEW.numero
    ),
    'Normal',
    'Planejamento',
    'Planejamento',
    0,
    NEW.contrato,
    pedido_encontrado,
    NEW.contato_nome,
    NEW.contato_email,
    COALESCE(NEW.contato_celular, NEW.cliente_telefone),
    COALESCE(NEW.endereco_instalacao, NEW.local),
    NEW.titulo,
    true,
    'PENDENTE',
    'PENDENTE',
    now(),
    now()
  )
  ON CONFLICT (proposta_id)
    WHERE proposta_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO servico_criado;

  IF servico_criado IS NOT NULL THEN
    INSERT INTO op_servico_historicos (
      servico_id,
      usuario,
      campo,
      valor_antigo,
      valor_novo,
      situacao,
      registrado_em
    )
    VALUES (
      servico_criado,
      COALESCE(NULLIF(current_setting(
        'app.usuario',
        true
      ), ''), 'automacao'),
      'abertura',
      NULL,
      'Serviço criado automaticamente pela aprovação da proposta',
      'Planejamento',
      now()
    );

    INSERT INTO op_servico_andamentos (
      servico_id,
      usuario,
      descricao,
      percentual,
      status_no_momento,
      registrado_em
    )
    VALUES (
      servico_criado,
      'automacao',
      'Serviço criado automaticamente após aprovação da proposta '
        || NEW.numero
        || '. Preparação inicial: 15 dias úteis.',
      0,
      'Planejamento',
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS op_propostas_criar_servico_aprovado
  ON op_propostas;

CREATE TRIGGER op_propostas_criar_servico_aprovado
AFTER INSERT OR UPDATE OF status
ON op_propostas
FOR EACH ROW
EXECUTE FUNCTION op_criar_servico_proposta_aprovada();
