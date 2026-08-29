CREATE TABLE "clientes_operacionais" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "origem" VARCHAR(40) NOT NULL,
  "origem_id" INTEGER NOT NULL, "codigo" VARCHAR(40), "razao_social" VARCHAR(255) NOT NULL,
  "nome_fantasia" VARCHAR(255), "cnpj" VARCHAR(30), "endereco" VARCHAR(255), "bairro" VARCHAR(120),
  "municipio" VARCHAR(120), "uf" CHAR(2), "cep" VARCHAR(20), "contato_nome" VARCHAR(160),
  "contato_email" VARCHAR(200), "contato_fone" VARCHAR(60), "website" VARCHAR(255), "ativo" BOOLEAN NOT NULL DEFAULT true,
  "origem_criado_em" TIMESTAMP(3), "origem_atualizado_em" TIMESTAMP(3), "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clientes_operacionais_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clientes_operacionais_origem_origem_id_key" ON "clientes_operacionais"("origem", "origem_id");
CREATE INDEX "clientes_operacionais_codigo_idx" ON "clientes_operacionais"("codigo");
CREATE INDEX "clientes_operacionais_razao_social_idx" ON "clientes_operacionais"("razao_social");
CREATE INDEX "clientes_operacionais_cnpj_idx" ON "clientes_operacionais"("cnpj");

CREATE TABLE "ordens_servico" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "origem" VARCHAR(40) NOT NULL, "origem_id" INTEGER NOT NULL,
  "numero" VARCHAR(60) NOT NULL, "cliente_id" UUID, "cliente_codigo" VARCHAR(40), "cliente_nome" VARCHAR(255),
  "local" VARCHAR(100), "telefone" VARCHAR(60), "cep" VARCHAR(20), "uf" CHAR(2), "tipo" VARCHAR(255),
  "situacao" VARCHAR(120), "fase_negociacao" VARCHAR(120), "status" VARCHAR(60), "equipamento" TEXT, "produto" TEXT,
  "chamado" VARCHAR(80), "contrato" VARCHAR(100), "tipo_contrato" VARCHAR(255), "titulo" VARCHAR(255),
  "situacao_contrato" VARCHAR(120), "endereco_obra" TEXT, "fatura" VARCHAR(100), "pedido" VARCHAR(100),
  "representante" VARCHAR(160), "valor" DECIMAL(18,2) DEFAULT 0, "abertura" TIMESTAMP(3), "fechamento" TIMESTAMP(3),
  "duracao" VARCHAR(80), "cadastro" DATE, "cep_entrega" VARCHAR(20), "classificacao" VARCHAR(120),
  "tecnico" VARCHAR(160), "atendente" VARCHAR(160), "solicitante" VARCHAR(160), "terceiros" VARCHAR(255),
  "tipo_conclusao" VARCHAR(120), "zona_atuacao" VARCHAR(120), "ultima_origem" VARCHAR(120),
  "solicitacao" TEXT, "laudo" TEXT, "conclusao" TEXT, "observacao" TEXT, "aceite_nome" VARCHAR(160), "aceite_em" TIMESTAMP(3),
  "origem_criado_em" TIMESTAMP(3), "origem_atualizado_em" TIMESTAMP(3), "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ordens_servico_origem_origem_id_key" ON "ordens_servico"("origem", "origem_id");
CREATE INDEX "ordens_servico_numero_idx" ON "ordens_servico"("numero");
CREATE INDEX "ordens_servico_cliente_codigo_idx" ON "ordens_servico"("cliente_codigo");
CREATE INDEX "ordens_servico_cliente_nome_idx" ON "ordens_servico"("cliente_nome");
CREATE INDEX "ordens_servico_contrato_idx" ON "ordens_servico"("contrato");
CREATE INDEX "ordens_servico_status_situacao_idx" ON "ordens_servico"("status", "situacao");
CREATE INDEX "ordens_servico_abertura_idx" ON "ordens_servico"("abertura");
CREATE INDEX "ordens_servico_origem_atualizado_em_idx" ON "ordens_servico"("origem_atualizado_em");
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_operacionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissoes" ("id","hub","modulo","acao","descricao","criado_em") VALUES
(gen_random_uuid(),'OPERACIONAL','OS','VISUALIZAR','Visualizar ordens de serviço',CURRENT_TIMESTAMP),
(gen_random_uuid(),'OPERACIONAL','OS','IMPORTAR','Importar ordens do legado',CURRENT_TIMESTAMP)
ON CONFLICT ("hub","modulo","acao") DO UPDATE SET "descricao"=EXCLUDED."descricao";
INSERT INTO "perfis_permissoes" ("perfil_id","permissao_id","efeito","criado_em")
SELECT up."perfil_id", p."id", 'PERMITIR'::"EfeitoPermissao", CURRENT_TIMESTAMP
FROM "usuarios" u JOIN "usuarios_perfis" up ON up."usuario_id"=u."id"
CROSS JOIN "permissoes" p
WHERE u."email"='admin@engeradios.local' AND p."hub"='OPERACIONAL'
ON CONFLICT ("perfil_id","permissao_id") DO UPDATE SET "efeito"='PERMITIR'::"EfeitoPermissao";
