-- Financeiro Fase 1B - fundacao multi-filial
-- Expansao compativel: campos novos opcionais e campo textual legado preservado.

CREATE TABLE "fin_filiais" (
  "id" BIGSERIAL NOT NULL,
  "codigo" VARCHAR(40) NOT NULL,
  "nome" VARCHAR(120) NOT NULL,
  "cnpj" VARCHAR(14),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fin_filiais_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_filiais_codigo_key" ON "fin_filiais"("codigo");
CREATE UNIQUE INDEX "fin_filiais_cnpj_key" ON "fin_filiais"("cnpj");
CREATE INDEX "fin_filiais_ativo_idx" ON "fin_filiais"("ativo");

INSERT INTO "fin_filiais" ("codigo", "nome") VALUES
  ('ENG_COMERCIO_56', 'ENG COMERCIO-56'),
  ('ENG_PROJETOS_20', 'ENG PROJETOS-20'),
  ('ENGERADIOS_75',   'ENGERADIOS-75'),
  ('ENGERADIOS_40',   'ENGERADIOS-40'),
  ('ENGERADIOS_13',   'ENGERADIOS-13');

ALTER TABLE "fin_contas_pagar" ADD COLUMN "filial_id" BIGINT;
ALTER TABLE "fin_contas_receber" ADD COLUMN "filial_id" BIGINT;
ALTER TABLE "fin_fluxos_saldo" ADD COLUMN "filial_id" BIGINT;
ALTER TABLE "fin_notas_recebidas" ADD COLUMN "filial_id" BIGINT;

-- Mapeamento tolerante a espacos, hifens e caixa, sem alterar o texto legado.
UPDATE "fin_contas_pagar" p
SET "filial_id" = f."id"
FROM "fin_filiais" f
WHERE regexp_replace(upper(coalesce(p."filial",'')), '[^A-Z0-9]', '', 'g') =
      regexp_replace(upper(f."nome"), '[^A-Z0-9]', '', 'g');

UPDATE "fin_contas_receber" r
SET "filial_id" = f."id"
FROM "fin_filiais" f
WHERE regexp_replace(upper(coalesce(r."filial",'')), '[^A-Z0-9]', '', 'g') =
      regexp_replace(upper(f."nome"), '[^A-Z0-9]', '', 'g');

UPDATE "fin_fluxos_saldo" s
SET "filial_id" = f."id"
FROM "fin_filiais" f
WHERE regexp_replace(upper(coalesce(s."filial",'')), '[^A-Z0-9]', '', 'g') =
      regexp_replace(upper(f."nome"), '[^A-Z0-9]', '', 'g');

CREATE INDEX "fin_contas_pagar_filial_id_idx" ON "fin_contas_pagar"("filial_id");
CREATE INDEX "fin_contas_receber_filial_id_idx" ON "fin_contas_receber"("filial_id");
CREATE INDEX "fin_fluxos_saldo_filial_id_idx" ON "fin_fluxos_saldo"("filial_id");
CREATE INDEX "fin_notas_recebidas_filial_id_idx" ON "fin_notas_recebidas"("filial_id");

ALTER TABLE "fin_contas_pagar"
  ADD CONSTRAINT "fin_contas_pagar_filial_id_fkey"
  FOREIGN KEY ("filial_id") REFERENCES "fin_filiais"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "fin_contas_receber"
  ADD CONSTRAINT "fin_contas_receber_filial_id_fkey"
  FOREIGN KEY ("filial_id") REFERENCES "fin_filiais"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "fin_fluxos_saldo"
  ADD CONSTRAINT "fin_fluxos_saldo_filial_id_fkey"
  FOREIGN KEY ("filial_id") REFERENCES "fin_filiais"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "fin_notas_recebidas"
  ADD CONSTRAINT "fin_notas_recebidas_filial_id_fkey"
  FOREIGN KEY ("filial_id") REFERENCES "fin_filiais"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "fin_contas_pagar" VALIDATE CONSTRAINT "fin_contas_pagar_filial_id_fkey";
ALTER TABLE "fin_contas_receber" VALIDATE CONSTRAINT "fin_contas_receber_filial_id_fkey";
ALTER TABLE "fin_fluxos_saldo" VALIDATE CONSTRAINT "fin_fluxos_saldo_filial_id_fkey";
ALTER TABLE "fin_notas_recebidas" VALIDATE CONSTRAINT "fin_notas_recebidas_filial_id_fkey";
