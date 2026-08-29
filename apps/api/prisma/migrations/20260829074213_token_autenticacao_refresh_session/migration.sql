ALTER TABLE public.tokens_autenticacao
  DROP CONSTRAINT tokens_autenticacao_tipo_ck;

ALTER TABLE public.tokens_autenticacao
  ADD CONSTRAINT tokens_autenticacao_tipo_ck
  CHECK (
    tipo::text = ANY (
      ARRAY[
        'ATIVACAO'::character varying,
        'RECUPERACAO'::character varying,
        'REFRESH_SESSION'::character varying
      ]::text[]
    )
  );
