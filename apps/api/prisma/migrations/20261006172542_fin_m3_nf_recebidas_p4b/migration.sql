\set ON_ERROR_STOP on

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- ============================================================================
-- PROTEÇÃO:
-- Esta migration NÃO altera:
--   public.fin_filiais
--   public.fin_filiais_historico
--   public.fin_contas_receber
--   public.fin_fluxos_saldo
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.est_produtos') IS NOT NULL
     OR to_regclass('public.fin_nfe_dist_controle') IS NOT NULL
     OR to_regclass('public.fin_notas_recebidas_eventos') IS NOT NULL THEN
    RAISE EXCEPTION
      'Estrutura P4B já localizada. Aplicação idempotente não autorizada.';
  END IF;
END
$$;

-- ============================================================================
-- 1. CONFERÊNCIA, MANIFESTAÇÃO, DOCUMENTOS E INTEGRAÇÕES
-- ============================================================================

ALTER TABLE public.fin_notas_recebidas
  ADD COLUMN tipo_documento varchar(10)
    NOT NULL DEFAULT 'NFE',

  ADD COLUMN status_conferencia varchar(30)
    NOT NULL DEFAULT 'PENDENTE_CONFERENCIA',

  ADD COLUMN conferido_por_id uuid,
  ADD COLUMN conferido_por_nome varchar(160),
  ADD COLUMN conferido_em timestamp(6),

  ADD COLUMN motivo_recusa text,
  ADD COLUMN divergencia_obs text,

  ADD COLUMN resumo_apenas boolean
    NOT NULL DEFAULT false,

  ADD COLUMN dest_cnpj varchar(14),

  ADD COLUMN manifestacao_tipo varchar(30),
  ADD COLUMN manifestacao_status varchar(30),
  ADD COLUMN manifestacao_protocolo varchar(60),
  ADD COLUMN manifestacao_em timestamp(6),

  ADD COLUMN danfe_arquivo varchar(500),
  ADD COLUMN danfe_sha256 char(64),

  ADD COLUMN nfse_codigo_verificacao varchar(100),
  ADD COLUMN nfse_municipio_ibge varchar(7),

  ADD COLUMN fornecedor_id uuid,
  ADD COLUMN compras_pedido_id uuid,

  ADD COLUMN estoque_status varchar(30)
    NOT NULL DEFAULT 'NAO_APLICAVEL',

  ADD COLUMN estoque_movimentado_em timestamp(6),

  ADD CONSTRAINT fin_nr_tipo_documento_ck
    CHECK (tipo_documento IN ('NFE','NFSE','CTE')),

  ADD CONSTRAINT fin_nr_status_conferencia_ck
    CHECK (
      status_conferencia IN (
        'PENDENTE_CONFERENCIA',
        'EM_CONFERENCIA',
        'ACEITA',
        'RECUSADA',
        'DIVERGENTE',
        'CANCELADA'
      )
    ),

  ADD CONSTRAINT fin_nr_manifestacao_tipo_ck
    CHECK (
      manifestacao_tipo IS NULL
      OR manifestacao_tipo IN (
        'CIENCIA',
        'CONFIRMACAO',
        'DESCONHECIMENTO',
        'NAO_REALIZADA'
      )
    ),

  ADD CONSTRAINT fin_nr_estoque_status_ck
    CHECK (
      estoque_status IN (
        'NAO_APLICAVEL',
        'PENDENTE',
        'MOVIMENTADO',
        'ESTORNADO'
      )
    ),

  ADD CONSTRAINT fin_nr_dest_cnpj_ck
    CHECK (
      dest_cnpj IS NULL
      OR dest_cnpj ~ '^[0-9]{14}$'
    ),

  ADD CONSTRAINT fin_nr_danfe_sha256_ck
    CHECK (
      danfe_sha256 IS NULL
      OR danfe_sha256 ~ '^[0-9a-f]{64}$'
    ),

  ADD CONSTRAINT fin_nr_recusa_motivo_ck
    CHECK (
      status_conferencia <> 'RECUSADA'
      OR NULLIF(btrim(motivo_recusa), '') IS NOT NULL
    ),

  ADD CONSTRAINT fin_notas_recebidas_fornecedor_id_fkey
    FOREIGN KEY (fornecedor_id)
    REFERENCES public.compras_fornecedores(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  ADD CONSTRAINT fin_notas_recebidas_compras_pedido_id_fkey
    FOREIGN KEY (compras_pedido_id)
    REFERENCES public.compras_pedidos(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

CREATE INDEX fin_notas_recebidas_status_conferencia_idx
  ON public.fin_notas_recebidas(status_conferencia);

CREATE INDEX fin_notas_recebidas_fornecedor_idx
  ON public.fin_notas_recebidas(fornecedor_id);

CREATE INDEX fin_notas_recebidas_compras_pedido_idx
  ON public.fin_notas_recebidas(compras_pedido_id);

-- ============================================================================
-- 2. CONTROLE DE DISTRIBUIÇÃO DFE POR NSU
-- ============================================================================

CREATE TABLE public.fin_nfe_dist_controle (
  id bigserial PRIMARY KEY,

  filial_id bigint NOT NULL,

  ambiente smallint
    NOT NULL DEFAULT 1,

  ult_nsu varchar(15)
    NOT NULL DEFAULT '000000000000000',

  max_nsu varchar(15)
    NOT NULL DEFAULT '000000000000000',

  ultima_consulta_em timestamp(6),
  proxima_consulta_em timestamp(6),

  ultimo_cstat varchar(5),
  ultimo_xmotivo varchar(255),

  consultas_total integer
    NOT NULL DEFAULT 0,

  documentos_total integer
    NOT NULL DEFAULT 0,

  erros_consecutivos integer
    NOT NULL DEFAULT 0,

  ultima_falha_em timestamp(6),
  ultima_falha text,

  ativo boolean
    NOT NULL DEFAULT true,

  criado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  atualizado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fin_nfe_dist_controle_filial_id_key
    UNIQUE(filial_id),

  CONSTRAINT fin_nfe_dist_controle_filial_id_fkey
    FOREIGN KEY(filial_id)
    REFERENCES public.fin_filiais(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fin_nfe_dist_ambiente_ck
    CHECK (ambiente IN (1,2)),

  CONSTRAINT fin_nfe_dist_ult_nsu_ck
    CHECK (ult_nsu ~ '^[0-9]{15}$'),

  CONSTRAINT fin_nfe_dist_max_nsu_ck
    CHECK (max_nsu ~ '^[0-9]{15}$'),

  CONSTRAINT fin_nfe_dist_contadores_ck
    CHECK (
      consultas_total >= 0
      AND documentos_total >= 0
      AND erros_consecutivos >= 0
    )
);

COMMENT ON TABLE public.fin_nfe_dist_controle IS
  'Controle da consulta NFeDistribuicaoDFe por NSU e por filial.';

-- Somente leitura de fin_filiais.
INSERT INTO public.fin_nfe_dist_controle(filial_id)
SELECT id
FROM public.fin_filiais
WHERE ativo = true
  AND cnpj IS NOT NULL
  AND btrim(cnpj) <> '';

-- ============================================================================
-- 3. HISTÓRICO DE EVENTOS DA NOTA
-- ============================================================================

CREATE TABLE public.fin_notas_recebidas_eventos (
  id bigserial PRIMARY KEY,

  nota_id bigint NOT NULL,

  tipo varchar(40) NOT NULL,

  status_anterior varchar(30),
  status_novo varchar(30),

  descricao text,
  protocolo varchar(100),
  dados jsonb,

  usuario_id uuid,
  usuario_nome varchar(160),

  criado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fin_notas_recebidas_eventos_nota_id_fkey
    FOREIGN KEY(nota_id)
    REFERENCES public.fin_notas_recebidas(id)
    ON UPDATE NO ACTION
    ON DELETE CASCADE,

  CONSTRAINT fin_nr_eventos_tipo_ck
    CHECK (
      tipo IN (
        'CAPTURA',
        'CONSULTA',
        'IMPORTACAO',
        'MANIFESTACAO',
        'CONFERENCIA',
        'ACEITE',
        'RECUSA',
        'DIVERGENCIA',
        'ENVIO_PAGAR',
        'ESTOQUE_ENTRADA',
        'ESTOQUE_ESTORNO',
        'CANCELAMENTO_SEFAZ',
        'OBSERVACAO'
      )
    )
);

CREATE INDEX fin_nr_eventos_nota_data_idx
  ON public.fin_notas_recebidas_eventos(nota_id, criado_em DESC);

CREATE INDEX fin_nr_eventos_tipo_idx
  ON public.fin_notas_recebidas_eventos(tipo);

-- ============================================================================
-- 4. ESTOQUE: LOCAIS
-- ============================================================================

CREATE TABLE public.est_locais (
  id bigserial PRIMARY KEY,

  codigo varchar(40) NOT NULL,
  nome varchar(160) NOT NULL,

  filial_id bigint,

  tipo varchar(30)
    NOT NULL DEFAULT 'ALMOXARIFADO',

  ativo boolean
    NOT NULL DEFAULT true,

  criado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  atualizado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT est_locais_codigo_key
    UNIQUE(codigo),

  CONSTRAINT est_locais_filial_id_fkey
    FOREIGN KEY(filial_id)
    REFERENCES public.fin_filiais(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT est_locais_tipo_ck
    CHECK (
      tipo IN (
        'ALMOXARIFADO',
        'VEICULO',
        'TECNICO',
        'OBRA',
        'TRANSITO',
        'OUTRO'
      )
    )
);

CREATE INDEX est_locais_filial_id_idx
  ON public.est_locais(filial_id);

-- Somente leitura de fin_filiais.
INSERT INTO public.est_locais(
  codigo,
  nome,
  filial_id
)
SELECT
  left('ALM_' || codigo, 40),
  left('Almoxarifado ' || nome, 160),
  id
FROM public.fin_filiais
WHERE ativo = true;

-- ============================================================================
-- 5. ESTOQUE: PRODUTOS
-- ============================================================================

CREATE TABLE public.est_produtos (
  id bigserial PRIMARY KEY,

  codigo varchar(120) NOT NULL,
  descricao varchar(500) NOT NULL,

  unidade varchar(20)
    NOT NULL DEFAULT 'UN',

  ncm varchar(20),
  cest varchar(20),
  gtin varchar(20),

  controla_estoque boolean
    NOT NULL DEFAULT true,

  estoque_minimo numeric(18,4)
    NOT NULL DEFAULT 0,

  ativo boolean
    NOT NULL DEFAULT true,

  criado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  atualizado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT est_produtos_codigo_key
    UNIQUE(codigo),

  CONSTRAINT est_produtos_estoque_minimo_ck
    CHECK (estoque_minimo >= 0)
);

CREATE INDEX est_produtos_descricao_idx
  ON public.est_produtos(descricao);

CREATE INDEX est_produtos_ncm_idx
  ON public.est_produtos(ncm);

CREATE INDEX est_produtos_gtin_idx
  ON public.est_produtos(gtin);

-- ============================================================================
-- 6. DE-PARA DE PRODUTOS POR FORNECEDOR
-- ============================================================================

CREATE TABLE public.est_produtos_fornecedor (
  id bigserial PRIMARY KEY,

  produto_id bigint NOT NULL,

  emit_cnpj varchar(14) NOT NULL,
  cod_produto_fornecedor varchar(120) NOT NULL,

  descricao_fornecedor varchar(500),
  unidade_fornecedor varchar(20),

  fator_conversao numeric(18,6)
    NOT NULL DEFAULT 1,

  criado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  atualizado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT est_produtos_fornecedor_produto_id_fkey
    FOREIGN KEY(produto_id)
    REFERENCES public.est_produtos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT est_prod_forn_cnpj_codigo_uq
    UNIQUE(emit_cnpj, cod_produto_fornecedor),

  CONSTRAINT est_prod_forn_cnpj_ck
    CHECK (emit_cnpj ~ '^[0-9]{14}$'),

  CONSTRAINT est_prod_forn_fator_ck
    CHECK (fator_conversao > 0)
);

CREATE INDEX est_produtos_fornecedor_produto_id_idx
  ON public.est_produtos_fornecedor(produto_id);

-- ============================================================================
-- 7. ITENS DA NOTA: PRODUTO, PEDIDO E CONFERÊNCIA
-- ============================================================================

ALTER TABLE public.fin_notas_recebidas_itens
  ADD COLUMN produto_id bigint,

  ADD COLUMN compras_pedido_item_id uuid,

  ADD COLUMN quantidade_conferida numeric(18,4),

  ADD COLUMN unidade_estoque varchar(20),

  ADD COLUMN fator_conversao numeric(18,6)
    NOT NULL DEFAULT 1,

  ADD COLUMN movimenta_estoque boolean
    NOT NULL DEFAULT true,

  ADD COLUMN estoque_movimentado boolean
    NOT NULL DEFAULT false,

  ADD COLUMN divergencia text,

  ADD CONSTRAINT fin_nf_itens_fator_ck
    CHECK (fator_conversao > 0),

  ADD CONSTRAINT fin_nf_itens_qtd_conferida_ck
    CHECK (
      quantidade_conferida IS NULL
      OR quantidade_conferida >= 0
    ),

  ADD CONSTRAINT fin_notas_recebidas_itens_produto_id_fkey
    FOREIGN KEY(produto_id)
    REFERENCES public.est_produtos(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  ADD CONSTRAINT fin_notas_recebidas_itens_pedido_item_id_fkey
    FOREIGN KEY(compras_pedido_item_id)
    REFERENCES public.compras_pedido_itens(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

CREATE INDEX fin_nf_itens_produto_idx
  ON public.fin_notas_recebidas_itens(produto_id);

CREATE INDEX fin_nf_itens_pedido_item_idx
  ON public.fin_notas_recebidas_itens(compras_pedido_item_id);

-- ============================================================================
-- 8. SALDOS DE ESTOQUE
-- ============================================================================

CREATE TABLE public.est_saldos (
  produto_id bigint NOT NULL,
  local_id bigint NOT NULL,

  quantidade numeric(18,4)
    NOT NULL DEFAULT 0,

  custo_medio numeric(18,6)
    NOT NULL DEFAULT 0,

  atualizado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT est_saldos_pkey
    PRIMARY KEY(produto_id, local_id),

  CONSTRAINT est_saldos_produto_id_fkey
    FOREIGN KEY(produto_id)
    REFERENCES public.est_produtos(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT est_saldos_local_id_fkey
    FOREIGN KEY(local_id)
    REFERENCES public.est_locais(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT est_saldos_custo_ck
    CHECK (custo_medio >= 0)
);

CREATE INDEX est_saldos_local_idx
  ON public.est_saldos(local_id);

-- ============================================================================
-- 9. MOVIMENTOS DE ESTOQUE
-- ============================================================================

CREATE TABLE public.est_movimentos (
  id bigserial PRIMARY KEY,

  produto_id bigint NOT NULL,
  local_id bigint NOT NULL,

  tipo varchar(30) NOT NULL,

  quantidade numeric(18,4) NOT NULL,
  custo_unitario numeric(18,6) NOT NULL DEFAULT 0,
  valor_total numeric(18,2) NOT NULL DEFAULT 0,

  origem varchar(30)
    NOT NULL DEFAULT 'MANUAL',

  origem_nota_id bigint,
  origem_nota_item_id bigint,

  estorno_de_id bigint,

  documento varchar(120),
  observacao text,

  usuario_id uuid,
  usuario_nome varchar(160),

  criado_em timestamp(6)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT est_movimentos_produto_id_fkey
    FOREIGN KEY(produto_id)
    REFERENCES public.est_produtos(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT est_movimentos_local_id_fkey
    FOREIGN KEY(local_id)
    REFERENCES public.est_locais(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT est_movimentos_origem_nota_id_fkey
    FOREIGN KEY(origem_nota_id)
    REFERENCES public.fin_notas_recebidas(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT est_movimentos_origem_nota_item_id_fkey
    FOREIGN KEY(origem_nota_item_id)
    REFERENCES public.fin_notas_recebidas_itens(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT est_movimentos_estorno_de_id_fkey
    FOREIGN KEY(estorno_de_id)
    REFERENCES public.est_movimentos(id)
    ON UPDATE NO ACTION
    ON DELETE RESTRICT,

  CONSTRAINT est_movimentos_estorno_de_id_key
    UNIQUE(estorno_de_id),

  CONSTRAINT est_mov_tipo_ck
    CHECK (
      tipo IN (
        'ENTRADA',
        'SAIDA',
        'AJUSTE_POSITIVO',
        'AJUSTE_NEGATIVO',
        'ESTORNO'
      )
    ),

  CONSTRAINT est_mov_qtd_ck
    CHECK (quantidade > 0),

  CONSTRAINT est_mov_custo_ck
    CHECK (custo_unitario >= 0),

  CONSTRAINT est_mov_valor_ck
    CHECK (valor_total >= 0),

  CONSTRAINT est_mov_origem_ck
    CHECK (
      origem IN (
        'NF_ENTRADA',
        'MANUAL',
        'INVENTARIO',
        'OS',
        'COMPRA',
        'ESTORNO'
      )
    ),

  CONSTRAINT est_mov_nf_ck
    CHECK (
      origem <> 'NF_ENTRADA'
      OR (
        origem_nota_id IS NOT NULL
        AND origem_nota_item_id IS NOT NULL
      )
    ),

  CONSTRAINT est_mov_estorno_ck
    CHECK (
      tipo <> 'ESTORNO'
      OR estorno_de_id IS NOT NULL
    )
);

CREATE INDEX est_movimentos_produto_local_data_idx
  ON public.est_movimentos(produto_id, local_id, criado_em DESC);

CREATE INDEX est_movimentos_origem_nota_idx
  ON public.est_movimentos(origem_nota_id);

CREATE INDEX est_movimentos_origem_item_idx
  ON public.est_movimentos(origem_nota_item_id);

-- Proteção adicional contra entrada duplicada do mesmo item.
CREATE UNIQUE INDEX est_movimentos_nf_item_entrada_uq
  ON public.est_movimentos(origem_nota_item_id)
  WHERE origem = 'NF_ENTRADA'
    AND tipo = 'ENTRADA'
    AND origem_nota_item_id IS NOT NULL;

-- ============================================================================
-- 10. CONTAS A PAGAR: UMA PARCELA = NO MÁXIMO UM TÍTULO
-- ============================================================================

ALTER TABLE public.fin_contas_pagar
  ADD COLUMN origem_nf_parcela_id bigint,

  ADD CONSTRAINT fin_contas_pagar_origem_nf_parcela_id_fkey
    FOREIGN KEY(origem_nf_parcela_id)
    REFERENCES public.fin_notas_recebidas_parcelas(id)
    ON UPDATE NO ACTION
    ON DELETE SET NULL;

CREATE UNIQUE INDEX fin_contas_pagar_origem_nf_parcela_id_key
  ON public.fin_contas_pagar(origem_nf_parcela_id)
  WHERE origem_nf_parcela_id IS NOT NULL;

-- ============================================================================
-- 11. PERMISSÕES
-- ============================================================================

INSERT INTO public.permissoes(
  id,
  hub,
  modulo,
  acao,
  descricao,
  criado_em
)
VALUES
  (
    gen_random_uuid(),
    'FINANCEIRO',
    'NOTAS_RECEBIDAS',
    'CONFERIR',
    'Conferir, aceitar, recusar e registrar divergências em notas recebidas',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'FINANCEIRO',
    'NOTAS_RECEBIDAS',
    'MANIFESTAR',
    'Registrar manifestação do destinatário na SEFAZ',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'FINANCEIRO',
    'NOTAS_RECEBIDAS',
    'CAPTURAR',
    'Executar captura e consulta de documentos fiscais recebidos',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ESTOQUE_LOGISTICA',
    'PRODUTOS',
    'VISUALIZAR',
    'Visualizar produtos e saldos de estoque',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ESTOQUE_LOGISTICA',
    'PRODUTOS',
    'GERENCIAR',
    'Cadastrar e atualizar produtos e códigos de fornecedores',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ESTOQUE_LOGISTICA',
    'MOVIMENTOS',
    'VISUALIZAR',
    'Visualizar movimentações de estoque',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ESTOQUE_LOGISTICA',
    'MOVIMENTOS',
    'GERENCIAR',
    'Lançar entradas, saídas, ajustes e estornos de estoque',
    CURRENT_TIMESTAMP
  )
ON CONFLICT(hub, modulo, acao)
DO NOTHING;

COMMENT ON TABLE public.fin_notas_recebidas_eventos IS
  'Histórico operacional e fiscal de cada documento recebido.';

COMMENT ON TABLE public.est_produtos_fornecedor IS
  'Mapeamento do código do produto no fornecedor para o produto interno.';

COMMENT ON COLUMN public.fin_notas_recebidas.resumo_apenas IS
  'Indica captura apenas como resumo fiscal, aguardando documento completo.';

COMMIT;
