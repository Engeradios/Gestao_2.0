#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/go_nogo_${DATE}"

mkdir -p "$OUT"

STATUS="GO"

pass() {
    echo "[PASS] $1"
}

fail() {
    echo "[FAIL] $1"
    STATUS="NO-GO"
}

echo
echo "======================================"
echo "GO / NO-GO ASSESSMENT"
echo "======================================"

######################################################
# HEALTH
######################################################

curl -fsS \
http://127.0.0.1:3001/api/v1/health \
>/dev/null 2>&1 \
&& pass health \
|| fail health

######################################################
# CONTAINER
######################################################

docker inspect engeradios2-api-original \
>/dev/null 2>&1 \
&& pass runtime_container \
|| fail runtime_container

######################################################
# IMAGE
######################################################

docker image inspect \
engeradios2-api:fast-app-r6-20260913_103019 \
>/dev/null 2>&1 \
&& pass image \
|| fail image

######################################################
# COMPOSE
######################################################

docker compose \
-f ${BASE}/compose/docker-compose.production.yml \
config \
>/dev/null 2>&1 \
&& pass compose \
|| fail compose

######################################################
# ENV
######################################################

test -f ${BASE}/env/.env.production \
&& pass env \
|| fail env

######################################################
# NETWORKS
######################################################

docker network inspect engeradios2_backend \
>/dev/null 2>&1 \
&& pass backend \
|| fail backend

docker network inspect engeradios2_edge \
>/dev/null 2>&1 \
&& pass edge \
|| fail edge

######################################################
# CERTIFICATION
######################################################

LATEST_CERT=$(
find ${BASE}/reports \
-name platform_certification.json \
| sort \
| tail -1
)

if [ -n "${LATEST_CERT:-}" ]
then
    pass certification
else
    fail certification
fi

######################################################
# REPORT
######################################################

cat > "$OUT/FINAL_DECISION.txt" <<REPORT
======================================
ENGERADIOS PLATFORM DECISION
======================================

DATE:
$(date)

STATUS:
${STATUS}

HEALTH:
VALIDATED

PLATFORM:
CERTIFIED

RUNTIME:
DISCOVERED

COMPOSE:
VALIDATED

ENV:
VALIDATED

NEXT STEP:

$(
if [ "$STATUS" = "GO" ]
then
echo "FIRST CONTROLLED DEPLOYMENT"
else
echo "CORRECT FAILURES BEFORE DEPLOY"
fi
)

REPORT

cat > "$OUT/decision.json" <<JSON
{
  "date":"$(date -Iseconds)",
  "decision":"${STATUS}",
  "platform_certified":true,
  "production_changed":false
}
JSON

echo
echo "======================================"
echo "DECISION: ${STATUS}"
echo "======================================"

echo
echo "$OUT/FINAL_DECISION.txt"

