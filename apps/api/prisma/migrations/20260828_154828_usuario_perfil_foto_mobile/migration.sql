ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "foto_perfil_caminho" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "foto_perfil_mime" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "foto_perfil_nome_original" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "foto_perfil_tamanho" INTEGER;
