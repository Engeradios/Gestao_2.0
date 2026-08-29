CREATE TABLE fin_dre_contas (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, codigo VARCHAR(40) NOT NULL UNIQUE,
 nome VARCHAR(180) NOT NULL, natureza CHAR(1) DEFAULT 'D', grupo_dre VARCHAR(120),
 is_grupo BOOLEAN NOT NULL DEFAULT FALSE, ordem INTEGER NOT NULL DEFAULT 0,
 ativo BOOLEAN NOT NULL DEFAULT TRUE, setor VARCHAR(80), criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX fin_dre_contas_setor_idx ON fin_dre_contas(setor);

CREATE TABLE fin_fluxos_saldo (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, filial VARCHAR(80), data_ref DATE NOT NULL,
 valor NUMERIC(18,2) NOT NULL DEFAULT 0, descricao VARCHAR(255), criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX fin_fluxos_saldo_data_idx ON fin_fluxos_saldo(data_ref);

CREATE TABLE fin_notas_recebidas (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, chave VARCHAR(60) UNIQUE, numero VARCHAR(40), serie VARCHAR(20),
 modelo VARCHAR(10) DEFAULT '55', natureza VARCHAR(160), data_emissao DATE, data_entrada DATE,
 emit_cnpj VARCHAR(30), emit_nome VARCHAR(255), emit_fantasia VARCHAR(255), emit_uf CHAR(2), emit_ie VARCHAR(40),
 valor_produtos NUMERIC(18,2) DEFAULT 0, valor_frete NUMERIC(18,2) DEFAULT 0, valor_seguro NUMERIC(18,2) DEFAULT 0,
 valor_desconto NUMERIC(18,2) DEFAULT 0, valor_outros NUMERIC(18,2) DEFAULT 0, valor_icms NUMERIC(18,2) DEFAULT 0,
 valor_icms_st NUMERIC(18,2) DEFAULT 0, valor_ipi NUMERIC(18,2) DEFAULT 0, valor_pis NUMERIC(18,2) DEFAULT 0,
 valor_cofins NUMERIC(18,2) DEFAULT 0, valor_total NUMERIC(18,2) DEFAULT 0, numero_pedido VARCHAR(80),
 projeto_legado_id INTEGER, protocolo VARCHAR(100), status_sefaz VARCHAR(80), origem VARCHAR(40) DEFAULT 'xml',
 situacao VARCHAR(40) DEFAULT 'Recebida', forma_pgto VARCHAR(80), categoria VARCHAR(120), observacoes TEXT,
 xml_arquivo VARCHAR(500), criado_por VARCHAR(160), criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, enviado_pagar BOOLEAN NOT NULL DEFAULT FALSE,
 enviado_pagar_em TIMESTAMP
);
CREATE INDEX fin_notas_recebidas_emissao_idx ON fin_notas_recebidas(data_emissao);
CREATE INDEX fin_notas_recebidas_situacao_idx ON fin_notas_recebidas(situacao);

CREATE TABLE fin_notas_recebidas_itens (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, nota_id BIGINT NOT NULL REFERENCES fin_notas_recebidas(id) ON DELETE CASCADE,
 n_item INTEGER, cod_produto VARCHAR(80), descricao VARCHAR(500), ncm VARCHAR(20), cfop VARCHAR(20), unidade VARCHAR(20),
 quantidade NUMERIC(18,4) DEFAULT 0, valor_unit NUMERIC(18,6) DEFAULT 0, valor_produto NUMERIC(18,2) DEFAULT 0,
 valor_total NUMERIC(18,2) DEFAULT 0, pedido VARCHAR(80)
);
CREATE INDEX fin_nf_itens_nota_idx ON fin_notas_recebidas_itens(nota_id);

CREATE TABLE fin_notas_recebidas_parcelas (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, nota_id BIGINT NOT NULL REFERENCES fin_notas_recebidas(id) ON DELETE CASCADE,
 numero VARCHAR(40), vencimento DATE, valor NUMERIC(18,2) DEFAULT 0, pago BOOLEAN NOT NULL DEFAULT FALSE, data_pagamento DATE
);
CREATE INDEX fin_nf_parcelas_nota_idx ON fin_notas_recebidas_parcelas(nota_id);
CREATE INDEX fin_nf_parcelas_vencimento_idx ON fin_notas_recebidas_parcelas(vencimento);

CREATE TABLE fin_contas_pagar (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, descricao VARCHAR(255) NOT NULL, fornecedor VARCHAR(255), documento VARCHAR(100),
 dre_conta_id BIGINT REFERENCES fin_dre_contas(id) ON DELETE SET NULL, filial VARCHAR(80), forma_pgto VARCHAR(80),
 data_emissao DATE, data_vencimento DATE, data_pagamento DATE, valor NUMERIC(18,2) DEFAULT 0,
 valor_pago NUMERIC(18,2) DEFAULT 0, juros_multa NUMERIC(18,2) DEFAULT 0, desconto NUMERIC(18,2) DEFAULT 0,
 situacao VARCHAR(40) DEFAULT 'A vencer', recorrente BOOLEAN NOT NULL DEFAULT FALSE, observacoes TEXT, criado_por VARCHAR(160),
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 origem_nf_id BIGINT REFERENCES fin_notas_recebidas(id) ON DELETE SET NULL, origem_nf_parcela_legado_id INTEGER
);
CREATE INDEX fin_pagar_vencimento_idx ON fin_contas_pagar(data_vencimento);
CREATE INDEX fin_pagar_situacao_idx ON fin_contas_pagar(situacao);

CREATE TABLE fin_contas_receber (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, chave_titulo VARCHAR(180) NOT NULL UNIQUE, filial VARCHAR(80), pedido VARCHAR(80),
 os VARCHAR(80), contrato VARCHAR(100), nfse VARCHAR(80), documento VARCHAR(100), tipo_documento VARCHAR(80), cpf_cnpj VARCHAR(30),
 bloqueado VARCHAR(40), cliente_codigo VARCHAR(80), cliente VARCHAR(255), cidade VARCHAR(160), uf CHAR(2), cep VARCHAR(20),
 classificacao VARCHAR(120), grupo VARCHAR(120), representante VARCHAR(180), data_emissao DATE, data_vencto DATE,
 previsao_pgto DATE, data_cancelado DATE, data_recebimento DATE, dias INTEGER, banco VARCHAR(100), num_titulo VARCHAR(100),
 bordero VARCHAR(100), total_retido NUMERIC(18,2) DEFAULT 0, valor_vencido NUMERIC(18,2) DEFAULT 0,
 valor_a_vencer NUMERIC(18,2) DEFAULT 0, valor_emissao NUMERIC(18,2) DEFAULT 0, valor_devido NUMERIC(18,2) DEFAULT 0,
 valor_juros_multa NUMERIC(18,2) DEFAULT 0, valor_total NUMERIC(18,2) DEFAULT 0, valor_recebido NUMERIC(18,2) DEFAULT 0,
 valor_desconto NUMERIC(18,2) DEFAULT 0, valor_produtos NUMERIC(18,2) DEFAULT 0, situacao VARCHAR(40), ultima_origem VARCHAR(120),
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX fin_receber_vencimento_idx ON fin_contas_receber(data_vencto);
CREATE INDEX fin_receber_situacao_idx ON fin_contas_receber(situacao);
CREATE INDEX fin_receber_cliente_idx ON fin_contas_receber(cliente_codigo);

CREATE TABLE fin_pedidos_venda (
 id BIGSERIAL PRIMARY KEY, legado_id INTEGER UNIQUE, local VARCHAR(80), local_estoque VARCHAR(80), pedido VARCHAR(80),
 pedido_normalizado VARCHAR(80), data_pedido DATE, data_prev_fat DATE, seu_pedido VARCHAR(100), area_entrega VARCHAR(120),
 fase_negociacao VARCHAR(120), situacao_pedido VARCHAR(120), cliente VARCHAR(255), endereco_entrega TEXT, bairro_entrega VARCHAR(160),
 cidade_entrega VARCHAR(180), representante VARCHAR(180), cond_pagamento VARCHAR(120), natureza VARCHAR(120), transportadora VARCHAR(180),
 tipo_frete VARCHAR(80), status VARCHAR(180), especie VARCHAR(80), motivo VARCHAR(255), produto VARCHAR(120), descricao VARCHAR(500),
 grupo VARCHAR(120), quantidade NUMERIC(18,4), valor_unitario NUMERIC(18,6), pct_desconto NUMERIC(18,4), val_desconto NUMERIC(18,2),
 valor_produtos NUMERIC(18,2), valor_st NUMERIC(18,2), valor_fcp_st NUMERIC(18,2), valor_ipi NUMERIC(18,2), frete NUMERIC(18,2),
 val_pedido NUMERIC(18,2), valor_enc_financ NUMERIC(18,2), valor_icms NUMERIC(18,2), pct_icms NUMERIC(18,4),
 valor_icms_dif NUMERIC(18,2), valor_icms_z_franca NUMERIC(18,2), pct_ipi NUMERIC(18,4), valor_partilha NUMERIC(18,2),
 valor_pobreza NUMERIC(18,2), texto TEXT, importado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX fin_pedidos_numero_idx ON fin_pedidos_venda(pedido_normalizado);
CREATE INDEX fin_pedidos_data_idx ON fin_pedidos_venda(data_pedido);

CREATE TABLE fin_importacoes (
 id BIGSERIAL PRIMARY KEY, origem_tabela VARCHAR(40) NOT NULL, legado_id INTEGER, origem VARCHAR(160), total_linhas INTEGER DEFAULT 0,
 novas INTEGER DEFAULT 0, atualizadas INTEGER DEFAULT 0, duplicadas INTEGER DEFAULT 0, erros INTEGER DEFAULT 0,
 arquivos INTEGER DEFAULT 0, usuario VARCHAR(160), importado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(origem_tabela, legado_id)
);
