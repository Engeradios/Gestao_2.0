#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/smtp_final_assessment_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "SMTP FINAL ASSESSMENT"
echo "======================================"

########################################
# CONFIG SMTP
########################################

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
    octet_length(senha_criptografada) AS senha_len,
    octet_length(senha_iv)            AS iv_len,
    octet_length(senha_tag)           AS tag_len,
    teste_sucesso,
    teste_detalhe,
    testado_em
FROM configuracao_email;
" \
> "$OUT/configuracao_email.txt"

########################################
# KEY
########################################

grep MAIL_ENCRYPTION_KEY \
/opt/engeradios2/platform/env/.env.production \
> "$OUT/mail_key.txt" || true

########################################
# LOGIN TEST
########################################

curl -s \
-X POST \
http://172.18.0.5:3001/api/v1/auth/login \
-H 'Content-Type: application/json' \
-d '{
  "email":"luiz.carelo@engeradios.com.br",
  "senha":"******"
}' \
> "$OUT/login_result.json" || true

########################################
# FORGOT PASSWORD TEST
########################################

curl -s \
-X POST \
http://172.18.0.5:3001/api/v1/auth/forgot-password \
-H 'Content-Type: application/json' \
-d '{
  "email":"luiz.carelo@engeradios.com.br"
}' \
> "$OUT/forgot_password_result.json" || true

########################################
# LOGS
########################################

docker logs engeradios2-api-debug \
> "$OUT/debug.log" 2>&1 || true

########################################
# SUMMARY
########################################

cat > "$OUT/SUMMARY.txt" <<REPORT
SMTP FINAL ASSESSMENT

RESULTADO ESPERADO:

LOGIN:
OK

FORGOT PASSWORD:
ERRO DE DESCRIPTOGRAFIA

SE ISSO OCORRER:

CAUSA MAIS PROVÁVEL:

A senha SMTP foi criptografada utilizando
uma chave diferente da MAIL_ENCRYPTION_KEY
atualmente configurada.

AÇÃO RECOMENDADA:

Reconfigurar SMTP pela interface administrativa
e salvar novamente a senha SMTP.
REPORT

echo
echo "======================================"
echo "SMTP FINAL ASSESSMENT COMPLETE"
echo "======================================"

echo
echo "$OUT"

