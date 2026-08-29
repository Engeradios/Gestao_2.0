ALTER TABLE "ordens_servico"
  ADD COLUMN "inicio_execucao" TIMESTAMP(3),
  ADD COLUMN "fim_execucao" TIMESTAMP(3),
  ADD COLUMN "prazo_entrega" TIMESTAMP(3),
  ADD COLUMN "aceite_cargo" VARCHAR(120),
  ADD COLUMN "aceite_setor" VARCHAR(120),
  ADD COLUMN "aceite_documento" VARCHAR(60),
  ADD COLUMN "aceite_aprovado" BOOLEAN;

CREATE TABLE "ordens_servico_equipamentos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ordem_servico_id" UUID NOT NULL,
  "origem" VARCHAR(40) NOT NULL,
  "origem_chave" VARCHAR(220) NOT NULL,
  "codigo" VARCHAR(80),
  "descricao" TEXT,
  "numero_interno" VARCHAR(160),
  "numero_fabricante" VARCHAR(160),
  "marca" VARCHAR(120),
  "modelo" VARCHAR(160),
  "setor" VARCHAR(160),
  "tipo" VARCHAR(40) NOT NULL DEFAULT 'EQUIPAMENTO',
  "status" VARCHAR(80),
  "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ordens_servico_equipamentos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "os_equipamentos_origem_chave_key" ON "ordens_servico_equipamentos"("origem", "origem_chave");
CREATE INDEX "os_equipamentos_ordem_servico_id_idx" ON "ordens_servico_equipamentos"("ordem_servico_id");
ALTER TABLE "ordens_servico_equipamentos" ADD CONSTRAINT "os_equipamentos_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "sincronizacoes_operacionais" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tipo" VARCHAR(40) NOT NULL,
  "status" VARCHAR(30) NOT NULL,
  "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizado_em" TIMESTAMP(3),
  "marco_anterior" TIMESTAMP(3),
  "marco_novo" TIMESTAMP(3),
  "clientes_lidos" INTEGER NOT NULL DEFAULT 0,
  "os_lidas" INTEGER NOT NULL DEFAULT 0,
  "equipamentos_processados" INTEGER NOT NULL DEFAULT 0,
  "mensagem" TEXT,
  "detalhes" JSONB,
  CONSTRAINT "sincronizacoes_operacionais_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sincronizacoes_operacionais_iniciado_em_idx" ON "sincronizacoes_operacionais"("iniciado_em");
CREATE INDEX "sincronizacoes_operacionais_status_idx" ON "sincronizacoes_operacionais"("status");
