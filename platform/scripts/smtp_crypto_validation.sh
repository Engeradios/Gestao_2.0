#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/smtp_crypto_validation_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "SMTP CRYPTO VALIDATION"
echo "======================================"

docker exec engeradios2-postgres \
psql \
-U engeradios_app \
-d engeradios2_novo \
-c "
SELECT
    id,
    ativo,
    host,
    porta,
    seguranca,
    usuario,
    remetente_email,
    remetente_nome,

    CASE
        WHEN senha_criptografada IS NULL THEN 'NULL'
        ELSE 'PRESENTE'
    END AS senha_criptografada,

    CASE
        WHEN senha_iv IS NULL THEN 'NULL'
        ELSE 'PRESENTE'
    END AS senha_iv,

    CASE
        WHEN senha_tag IS NULL THEN 'NULL'
        ELSE 'PRESENTE'
    END AS senha_tag,

    octet_length(senha_criptografada) AS senha_len,
    octet_length(senha_iv)            AS iv_len,
    octet_length(senha_tag)           AS tag_len,

    teste_sucesso,
    teste_detalhe,
    testado_em

FROM configuracao_email;
" \
> "$OUT/smtp_configuration_status.txt"

docker exec engeradios2-postgres \
psql \
-U engeradios_app \
-d engeradios2_novo \
-c "
SELECT
    id,
    criado_em,
    atualizado_em,
    atualizado_por
FROM configuracao_email;
" \
> "$OUT/smtp_metadata.txt"

grep MAIL_ENCRYPTION_KEY \
/opt/engeradios2/platform/env/.env.production \
> "$OUT/mail_key.txt"

curl -s \
-X POST \
http://172.18.0.5:3001/api/v1/auth/forgot-password \
-H 'Content-Type: application/json' \
-d '{
  "email":"luiz.carelo@engeradios.com.br"
}' \
> "$OUT/forgot_password_result.json" || true

cat > "$OUT/README.txt" <<REPORT
SMTP CRYPTO VALIDATION

Objetivo:
Validar integridade dos artefatos criptográficos SMTP.

Arquivos:

smtp_configuration_status.txt
smtp_metadata.txt
mail_key.txt
forgot_password_result.json

Nenhuma alteração realizada.
REPORT

echo
echo "======================================"
echo "SMTP VALIDATION COMPLETE"
echo "======================================"

echo
echo "$OUT"

