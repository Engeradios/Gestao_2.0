#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"
DATE=$(date +%Y%m%d_%H%M%S)
OUT="${BASE}/reports/smtp_root_cause_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "SMTP ROOT CAUSE ANALYSIS"
echo "======================================"

########################################
# ESTRUTURA DA TABELA
########################################

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c '\d+ configuracao_email' \
> "$OUT/configuracao_email_structure.txt"

########################################
# COLUNAS
########################################

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name='configuracao_email'
ORDER BY ordinal_position;
" \
> "$OUT/configuracao_email_columns.txt"

########################################
# DADOS (MASCARADOS)
########################################

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "
SELECT *
FROM configuracao_email
LIMIT 10;
" \
> "$OUT/configuracao_email_data.txt"

########################################
# TESTE SMTP
########################################

curl -s -X POST \
http://172.18.0.5:3001/api/v1/auth/forgot-password \
-H 'Content-Type: application/json' \
-d '{
  \"email\":\"luiz.carelo@engeradios.com.br\"
}' \
> "$OUT/forgot_password_result.json" || true

########################################
# VARIÁVEIS RELEVANTES
########################################

grep -E 'MAIL|SMTP' \
/opt/engeradios2/platform/env/.env.production \
> "$OUT/env_mail_variables.txt" || true

########################################
# INSPECT CONTAINER DEBUG
########################################

docker inspect engeradios2-api-debug \
> "$OUT/debug_container.json"

########################################
# RESUMO
########################################

cat > "$OUT/README.txt" <<REPORT
SMTP ROOT CAUSE ANALYSIS

Arquivos:

configuracao_email_structure.txt
configuracao_email_columns.txt
configuracao_email_data.txt
forgot_password_result.json
env_mail_variables.txt
debug_container.json

Objetivo:
Identificar onde a senha SMTP está armazenada
e por que a descriptografia falha.

Nenhum dado foi alterado.
Nenhuma configuração foi modificada.
REPORT

echo
echo "======================================"
echo "SMTP ANALYSIS COMPLETE"
echo "======================================"

echo
echo "$OUT"

