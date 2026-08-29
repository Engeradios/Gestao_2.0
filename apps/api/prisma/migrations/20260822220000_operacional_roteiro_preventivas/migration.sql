-- Roteiro Técnico e Preventivas - estrutura inicial formal
CREATE TABLE "op_preventivas" (
  "id" BIGSERIAL PRIMARY KEY,
  "cliente_nome" VARCHAR(220) NOT NULL,
  "contrato" VARCHAR(120),
  "vencimento_contrato" DATE,
  "equipamento" VARCHAR(500),
  "modelo" VARCHAR(220),
  "numero_serie" VARCHAR(120),
  "qtd_tecnicos" INTEGER NOT NULL DEFAULT 1,
  "frequencia_dias" INTEGER NOT NULL DEFAULT 30,
  "data_ultima_preventiva" DATE,
  "data_proxima_preventiva" DATE NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'Em Dia',
  "tecnico_responsavel" VARCHAR(160),
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "op_preventivas_qtd_tecnicos_ck" CHECK ("qtd_tecnicos" >= 1),
  CONSTRAINT "op_preventivas_frequencia_ck" CHECK ("frequencia_dias" >= 1)
);

CREATE TABLE "op_roteiro_visitas" (
  "id" BIGSERIAL PRIMARY KEY,
  "data_visita" DATE NOT NULL,
  "data_fim" DATE NOT NULL,
  "tecnico" VARCHAR(160) NOT NULL,
  "unidade" VARCHAR(2) NOT NULL DEFAULT 'RJ',
  "turno" VARCHAR(20) NOT NULL DEFAULT 'Diurno',
  "tipo" VARCHAR(20) NOT NULL,
  "servico_id" UUID,
  "preventiva_id" BIGINT,
  "observacoes" TEXT,
  "criado_por" VARCHAR(180),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ordem_execucao" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(30) NOT NULL DEFAULT 'Agendado',
  CONSTRAINT "op_roteiro_visitas_periodo_ck" CHECK ("data_fim" >= "data_visita"),
  CONSTRAINT "op_roteiro_visitas_ordem_ck" CHECK ("ordem_execucao" >= 1),
  CONSTRAINT "op_roteiro_visitas_tipo_ck" CHECK ("tipo" IN ('OPERACIONAL','PREVENTIVA','SEDE','AFASTADO')),
  CONSTRAINT "op_roteiro_visitas_turno_ck" CHECK ("turno" IN ('Diurno','Noturno')),
  CONSTRAINT "op_roteiro_visitas_origem_ck" CHECK (
    ("tipo" = 'OPERACIONAL' AND "servico_id" IS NOT NULL AND "preventiva_id" IS NULL) OR
    ("tipo" = 'PREVENTIVA' AND "preventiva_id" IS NOT NULL AND "servico_id" IS NULL) OR
    ("tipo" IN ('SEDE','AFASTADO') AND "servico_id" IS NULL AND "preventiva_id" IS NULL)
  ),
  CONSTRAINT "op_roteiro_visitas_servico_fk" FOREIGN KEY ("servico_id") REFERENCES "op_servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "op_roteiro_visitas_preventiva_fk" FOREIGN KEY ("preventiva_id") REFERENCES "op_preventivas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "op_preventivas_proxima_idx" ON "op_preventivas"("data_proxima_preventiva");
CREATE INDEX "op_preventivas_contrato_idx" ON "op_preventivas"("contrato");
CREATE INDEX "op_preventivas_cliente_idx" ON "op_preventivas"("cliente_nome");
CREATE INDEX "op_roteiro_visitas_data_unidade_idx" ON "op_roteiro_visitas"("data_visita", "data_fim", "unidade");
CREATE INDEX "op_roteiro_visitas_tecnico_data_idx" ON "op_roteiro_visitas"("tecnico", "data_visita");
CREATE INDEX "op_roteiro_visitas_status_idx" ON "op_roteiro_visitas"("status");
CREATE INDEX "op_roteiro_visitas_servico_idx" ON "op_roteiro_visitas"("servico_id");
CREATE INDEX "op_roteiro_visitas_preventiva_idx" ON "op_roteiro_visitas"("preventiva_id");
