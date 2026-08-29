CREATE TABLE "op_entregadores" (
  "id" BIGSERIAL PRIMARY KEY,
  "legado_id" INTEGER UNIQUE,
  "nome" VARCHAR(160) NOT NULL,
  "cnh" VARCHAR(40),
  "vencimento_cnh" DATE,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "op_entregadores_nome_key"
  ON "op_entregadores"("nome");
CREATE INDEX "op_entregadores_ativo_idx"
  ON "op_entregadores"("ativo");

CREATE TABLE "op_veiculos" (
  "id" BIGSERIAL PRIMARY KEY,
  "legado_id" INTEGER UNIQUE,
  "placa" VARCHAR(20) NOT NULL UNIQUE,
  "tipo" VARCHAR(80),
  "marca" VARCHAR(80),
  "modelo" VARCHAR(100),
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "op_veiculos_ativo_idx"
  ON "op_veiculos"("ativo");

CREATE TABLE "op_roteiro_entregas" (
  "id" BIGSERIAL PRIMARY KEY,
  "legado_id" INTEGER UNIQUE,
  "data_entrega" DATE NOT NULL,
  "entregador_id" BIGINT,
  "veiculo_id" BIGINT,
  "ordem_servico_id" UUID,
  "origem" VARCHAR(30) NOT NULL,
  "origem_numero" VARCHAR(80),
  "origem_numero_normalizado" VARCHAR(80),
  "cliente_nome" VARCHAR(255),
  "endereco_entrega" TEXT,
  "bairro" VARCHAR(120),
  "cidade" VARCHAR(160),
  "uf" CHAR(2),
  "observacao_rota" TEXT,
  "status" VARCHAR(40) NOT NULL DEFAULT 'Agendado',
  "observacao_retorno" TEXT,
  "criado_por" VARCHAR(160),
  "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ordem_execucao" INTEGER NOT NULL DEFAULT 1,
  "is_reentrega" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "op_roteiro_entregas_entregador_id_fkey"
    FOREIGN KEY ("entregador_id") REFERENCES "op_entregadores"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_entregas_veiculo_id_fkey"
    FOREIGN KEY ("veiculo_id") REFERENCES "op_veiculos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_entregas_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_entregas_origem_check"
    CHECK ("origem" IN ('OS', 'PEDIDO', 'OUTRO')),
  CONSTRAINT "op_roteiro_entregas_ordem_execucao_check"
    CHECK ("ordem_execucao" > 0)
);

CREATE INDEX "op_roteiro_entregas_data_entrega_idx"
  ON "op_roteiro_entregas"("data_entrega");
CREATE INDEX "op_roteiro_entregas_status_idx"
  ON "op_roteiro_entregas"("status");
CREATE INDEX "op_roteiro_entregas_entregador_id_idx"
  ON "op_roteiro_entregas"("entregador_id");
CREATE INDEX "op_roteiro_entregas_veiculo_id_idx"
  ON "op_roteiro_entregas"("veiculo_id");
CREATE INDEX "op_roteiro_entregas_ordem_servico_id_idx"
  ON "op_roteiro_entregas"("ordem_servico_id");
CREATE INDEX "op_roteiro_entregas_origem_numero_idx"
  ON "op_roteiro_entregas"("origem", "origem_numero_normalizado");
