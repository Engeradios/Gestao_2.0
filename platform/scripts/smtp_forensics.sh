#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"
DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/smtp_forensics_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "SMTP FORENSICS"
echo "======================================"

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "
SELECT
    id,
    host,
    porta,
    seguranca,
    usuario,
    ativo,

    encode(senha_criptografada,'hex') AS senha_hex,
    encode(senha_iv,'hex')            AS iv_hex,
    encode(senha_tag,'hex')           AS tag_hex,

    octet_length(senha_criptografada) AS senha_len,
    octet_length(senha_iv)            AS iv_len,
    octet_length(senha_tag)           AS tag_len

FROM configuracao_email;
" \
> "$OUT/smtp_crypto.txt"

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "
SELECT
    id,
    criado_em,
    atualizado_em,
    atualizado_por,
    teste_sucesso,
    teste_detalhe,
    testado_em
FROM configuracao_email;
" \
> "$OUT/smtp_metadata.txt"

grep MAIL_ENCRYPTION_KEY \
/opt/engeradios2/platform/env/.env.production \
> "$OUT/mail_key.txt"

echo
echo "======================================"
echo "SMTP FORENSICS COMPLETE"
echo "======================================"

echo
echo "$OUT"

