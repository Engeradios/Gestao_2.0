-- ENGERRADIOS GESTAO - GRANDES PROJETOS FASE 2
-- APLICACAO EXCLUSIVA APOS GATE FORMAL EM HML

ALTER TABLE public.gp_custo
  ADD COLUMN IF NOT EXISTS subcategoria varchar(120),
  ADD COLUMN IF NOT EXISTS natureza varchar(30) DEFAULT 'VARIAVEL',
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS quantidade numeric(14,4) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recorrente boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vigencia_inicio date,
  ADD COLUMN IF NOT EXISTS vigencia_fim date,
  ADD COLUMN IF NOT EXISTS periodicidade varchar(30),
  ADD COLUMN IF NOT EXISTS os_id integer,
  ADD COLUMN IF NOT EXISTS material_id integer,
  ADD COLUMN IF NOT EXISTS funcionario_id uuid,
  ADD COLUMN IF NOT EXISTS centro_custo varchar(120),
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.gp_os
  ADD COLUMN IF NOT EXISTS natureza_valor varchar(30) DEFAULT 'NAO_CLASSIFICADO',
  ADD COLUMN IF NOT EXISTS valor_venda numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_apropriavel numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prioridade varchar(30),
  ADD COLUMN IF NOT EXISTS data_programada timestamp,
  ADD COLUMN IF NOT EXISTS ultima_visita_em timestamp,
  ADD COLUMN IF NOT EXISTS proxima_visita_em timestamp;

UPDATE public.gp_os SET valor_venda = valor
WHERE valor_venda IS NULL AND valor IS NOT NULL;

ALTER TABLE public.gp_material
  ADD COLUMN IF NOT EXISTS codigo_interno varchar(120),
  ADD COLUMN IF NOT EXISTS qtd_solicitada numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_utilizada numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_devolvida numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fornecedor varchar(200),
  ADD COLUMN IF NOT EXISTS origem varchar(40) DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS situacao varchar(40) DEFAULT 'PREVISTO',
  ADD COLUMN IF NOT EXISTS documento varchar(160);

CREATE TABLE IF NOT EXISTS public.gp_visita (
  id bigserial PRIMARY KEY,
  projeto_id integer NOT NULL REFERENCES public.gp_projeto(id) ON DELETE CASCADE,
  os_id integer REFERENCES public.gp_os(id) ON DELETE SET NULL,
  tecnico varchar(200),
  funcionario_id uuid,
  data_inicio timestamp NOT NULL,
  data_fim timestamp,
  duracao_minutos integer,
  objetivo text,
  atividade_realizada text,
  pendencias text,
  proxima_acao text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  custo numeric(14,2) DEFAULT 0,
  status varchar(40) DEFAULT 'PROGRAMADA',
  criado_em timestamp DEFAULT now(),
  versao integer NOT NULL DEFAULT 1,
  excluido_em timestamp,
  excluido_por_id uuid,
  motivo_exclusao text
);

CREATE TABLE IF NOT EXISTS public.gp_projeto_equipe (
  id bigserial PRIMARY KEY,
  projeto_id integer NOT NULL REFERENCES public.gp_projeto(id) ON DELETE CASCADE,
  funcionario_id uuid,
  nome varchar(200) NOT NULL,
  funcao varchar(120),
  vigencia_inicio date,
  vigencia_fim date,
  custo_gerencial_mensal numeric(14,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT now(),
  versao integer NOT NULL DEFAULT 1,
  excluido_em timestamp,
  excluido_por_id uuid,
  motivo_exclusao text
);

CREATE TABLE IF NOT EXISTS public.gp_risco (
  id bigserial PRIMARY KEY,
  projeto_id integer NOT NULL REFERENCES public.gp_projeto(id) ON DELETE CASCADE,
  titulo varchar(200) NOT NULL,
  descricao text,
  impacto varchar(30) DEFAULT 'MODERADO',
  probabilidade varchar(30) DEFAULT 'MEDIA',
  criticidade varchar(30) DEFAULT 'MODERADA',
  responsavel varchar(200),
  prazo date,
  status varchar(40) DEFAULT 'ABERTO',
  plano_acao text,
  criado_em timestamp DEFAULT now(),
  versao integer NOT NULL DEFAULT 1,
  excluido_em timestamp,
  excluido_por_id uuid,
  motivo_exclusao text
);

CREATE INDEX IF NOT EXISTS idx_gp_custo_competencia ON public.gp_custo(projeto_id, competencia);
CREATE INDEX IF NOT EXISTS idx_gp_custo_natureza ON public.gp_custo(natureza);
CREATE INDEX IF NOT EXISTS idx_gp_visita_projeto_data ON public.gp_visita(projeto_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_gp_visita_os ON public.gp_visita(os_id);
CREATE INDEX IF NOT EXISTS idx_gp_equipe_projeto_ativo ON public.gp_projeto_equipe(projeto_id, ativo);
CREATE INDEX IF NOT EXISTS idx_gp_risco_projeto_status ON public.gp_risco(projeto_id, status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_gp_custo_natureza') THEN
    ALTER TABLE public.gp_custo ADD CONSTRAINT ck_gp_custo_natureza
      CHECK (natureza IN ('FIXO','VARIAVEL','RECORRENTE','OS','PESSOAL','MATERIAL','OUTRO')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_gp_os_natureza_valor') THEN
    ALTER TABLE public.gp_os ADD CONSTRAINT ck_gp_os_natureza_valor
      CHECK (natureza_valor IN ('NAO_CLASSIFICADO','VENDA','CUSTO','ESTIMATIVA','MISTO')) NOT VALID;
  END IF;
END $$;
