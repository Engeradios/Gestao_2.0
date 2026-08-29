CREATE TABLE IF NOT EXISTS "dashboard_tv_dispositivos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dashboard_id" UUID NOT NULL,
  "identificador" VARCHAR(80) NOT NULL,
  "apelido" VARCHAR(120),
  "resolucao" VARCHAR(30),
  "navegador" VARCHAR(120),
  "versao_app" VARCHAR(30),
  "ultimo_contato_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dashboard_tv_dispositivos_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "dashboard_tv_dispositivos_dashboard_id_fkey"
    FOREIGN KEY ("dashboard_id")
    REFERENCES "dashboard_tv_paineis"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "dashboard_tv_dispositivos_dashboard_identificador_key"
    UNIQUE ("dashboard_id", "identificador")
);

CREATE INDEX IF NOT EXISTS
  "dashboard_tv_dispositivos_dashboard_contato_idx"
ON "dashboard_tv_dispositivos"
  ("dashboard_id", "ultimo_contato_em");
