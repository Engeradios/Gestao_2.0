#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/smtp_diagnostic_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "SMTP DIAGNOSTIC"
echo "======================================"

########################################
# ENV
########################################

cp /opt/engeradios2/platform/env/.env.production \
"$OUT/env.production"

########################################
# DEBUG ENV
########################################

cp /opt/engeradios2/platform/env/.env.debug \
"$OUT/env.debug"

########################################
# CONTAINER ENV
########################################

docker inspect engeradios2-api-debug \
> "$OUT/debug_container_inspect.json"

docker inspect engeradios2-api-original \
> "$OUT/original_container_inspect.json"

########################################
# SMTP TEST
########################################

curl -s -X POST \
http://172.18.0.5:3001/api/v1/auth/forgot-password \
-H "Content-Type: application/json" \
-d '{"email":"luiz.carelo@engeradios.com.br"}' \
> "$OUT/smtp_test.json" || true

########################################
# DATABASE TABLE DISCOVERY
########################################

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "
SELECT tablename
FROM pg_tables
WHERE schemaname='public'
AND (
       tablename ILIKE '%smtp%'
    OR tablename ILIKE '%mail%'
    OR tablename ILIKE '%email%'
    OR tablename ILIKE '%config%'
    OR tablename ILIKE '%setting%'
)
ORDER BY tablename;
" \
> "$OUT/suspect_tables.txt"

########################################
# FULL TABLE LIST
########################################

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "\dt" \
> "$OUT/all_tables.txt"

########################################
# LOGS
########################################

docker logs engeradios2-api-debug \
> "$OUT/debug_logs.txt" 2>&1 || true

########################################
# SUMMARY
########################################

cat > "$OUT/README.txt" <<REPORT
SMTP DIAGNOSTIC

FILES:

env.production
env.debug
smtp_test.json
suspect_tables.txt
all_tables.txt
debug_logs.txt

NEXT STEP:

Locate SMTP configuration table
Validate encrypted password source
Compare with MAIL_ENCRYPTION_KEY
REPORT

echo
echo "======================================"
echo "SMTP DIAGNOSTIC COMPLETE"
echo "======================================"

echo
echo "$OUT"

