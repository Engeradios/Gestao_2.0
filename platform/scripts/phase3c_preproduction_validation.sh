#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/preproduction_validation_${DATE}"

mkdir -p "$OUT"

STATUS="APPROVED"

pass() {
    echo "[PASS] $1"
}

fail() {
    echo "[FAIL] $1"
    STATUS="FAILED"
}

echo
echo "================================="
echo "PHASE 3C"
echo "PRE-PRODUCTION VALIDATION"
echo "================================="

########################################################
# RUNTIME ACTUAL
########################################################

docker inspect engeradios2-api-original \
> "$OUT/runtime.json"

########################################################
# COMPOSE RESOLVIDO
########################################################

docker compose \
-f ${BASE}/compose/docker-compose.production.yml \
config \
> "$OUT/compose.yml"

########################################################
# HEALTH
########################################################

if curl -fsS \
http://127.0.0.1:3001/api/v1/health \
> "$OUT/health.json"
then
    pass "health"
else
    fail "health"
fi

########################################################
# IMAGEM
########################################################

RUNTIME_IMAGE=$(
docker inspect engeradios2-api-original \
--format '{{.Config.Image}}'
)

if grep -q "$RUNTIME_IMAGE" "$OUT/compose.yml"
then
    pass "image_match"
else
    fail "image_match"
fi

########################################################
# REDE BACKEND
########################################################

docker network inspect engeradios2_backend \
>/dev/null 2>&1 \
&& pass "network_backend" \
|| fail "network_backend"

########################################################
# REDE EDGE
########################################################

docker network inspect engeradios2_edge \
>/dev/null 2>&1 \
&& pass "network_edge" \
|| fail "network_edge"

########################################################
# PORTA
########################################################

if ss -tulpn | grep -q ':3001 '
then
    pass "port_3001"
else
    fail "port_3001"
fi

########################################################
# VOLUMES
########################################################

for d in \
/opt/engeradios2/storage/propostas \
/opt/engeradios2/storage/servicos \
/var/lib/engeradios2/contratos \
/var/lib/engeradios2/perfis \
/opt/engeradios2/storage/app-campo/evidencias \
/opt/engeradios2/storage/orcamento/evidencias
do

    if [ -d "$d" ]
    then
        pass "$d"
    else
        fail "$d"
    fi

done > "$OUT/storage_check.txt"

########################################################
# ENV CRITICO
########################################################

grep -q DATABASE_URL \
${BASE}/env/.env.production \
&& pass "DATABASE_URL" \
|| fail "DATABASE_URL"

grep -q JWT_SECRET \
${BASE}/env/.env.production \
&& pass "JWT_SECRET" \
|| fail "JWT_SECRET"

grep -q MAIL_ENCRYPTION_KEY \
${BASE}/env/.env.production \
&& pass "MAIL_ENCRYPTION_KEY" \
|| fail "MAIL_ENCRYPTION_KEY"

########################################################
# RELEASES
########################################################

find ${BASE}/releases \
-maxdepth 2 \
-type f \
> "$OUT/releases_inventory.txt"

########################################################
# AUDIT TRAIL
########################################################

cat > "$OUT/audit.json" <<AUDIT
{
  "phase":"3C",
  "date":"$(date -Iseconds)",
  "status":"${STATUS}",
  "production_modified":false,
  "ready_for_real_deployment":"$([ "$STATUS" = "APPROVED" ] && echo true || echo false)"
}
AUDIT

########################################################
# RELATORIO EXECUTIVO
########################################################

cat > "$OUT/PREPRODUCTION_REPORT.txt" <<REPORT
=================================
PRE-PRODUCTION VALIDATION
=================================

DATE:
$(date)

STATUS:
${STATUS}

PRODUCTION CHANGED:
NO

READY FOR REAL DEPLOYMENT:
$([ "$STATUS" = "APPROVED" ] && echo YES || echo NO)

NEXT PHASE:
PHASE 4

OBJECTIVE:
First controlled deployment.

REPORT

echo
echo "================================="
echo "PRE-PRODUCTION VALIDATION"
echo "COMPLETED"
echo "================================="

echo
echo "STATUS: ${STATUS}"

echo
echo "REPORT:"
echo "$OUT/PREPRODUCTION_REPORT.txt"

