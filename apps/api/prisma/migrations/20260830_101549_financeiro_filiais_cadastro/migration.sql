ALTER TABLE fin_filiais
  ADD COLUMN razao_social VARCHAR(180),
  ADD COLUMN nome_fantasia VARCHAR(180),
  ADD COLUMN tipo_estabelecimento VARCHAR(10) NOT NULL DEFAULT 'FILIAL',
  ADD COLUMN inscricao_estadual VARCHAR(30),
  ADD COLUMN inscricao_municipal VARCHAR(30),
  ADD COLUMN cep VARCHAR(8),
  ADD COLUMN logradouro VARCHAR(180),
  ADD COLUMN numero VARCHAR(20),
  ADD COLUMN complemento VARCHAR(100),
  ADD COLUMN bairro VARCHAR(100),
  ADD COLUMN cidade VARCHAR(100),
  ADD COLUMN uf VARCHAR(2);
ALTER TABLE fin_filiais ADD CONSTRAINT fin_filiais_tipo_ck CHECK (tipo_estabelecimento IN ('MATRIZ','FILIAL'));
ALTER TABLE fin_filiais ADD CONSTRAINT fin_filiais_cnpj_formato_ck CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$');
CREATE INDEX fin_filiais_nome_idx ON fin_filiais(nome);

CREATE TABLE fin_filiais_historico (
  id BIGSERIAL PRIMARY KEY,
  filial_id BIGINT NOT NULL REFERENCES fin_filiais(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  usuario_id UUID,
  acao VARCHAR(30) NOT NULL,
  antes JSONB,
  depois JSONB,
  criado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX fin_filiais_historico_filial_data_idx ON fin_filiais_historico(filial_id, criado_em DESC);
