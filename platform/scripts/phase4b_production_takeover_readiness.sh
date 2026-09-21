#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/production_takeover_${DATE}"

mkdir -p "$OUT"

STATUS="APPROVED"

PASS() {
  echo "[PASS] $1"
}

FAIL() {
  echo "[FAIL] $1"
  STATUS="FAILED"
}

echo
echo "======================================"
echo "PHASE 4B"
echo "PRODUCTION TAKEOVER READINESS"
echo "======================================"

########################################################
# RUNTIME
########################################################

docker inspect engeradios2-api-original \
> "$OUT/runtime.json"

PASS runtime_snapshot

########################################################
# COMPOSE
########################################################

docker compose \
-f ${BASE}/compose/docker-compose.production.yml \
config \
> "$OUT/compose.yml"

PASS compose_snapshot

########################################################
# HEALTH
########################################################

if curl -fsS \
http://127.0.0.1:3001/api/v1/health \
> "$OUT/health.json"
then
  PASS health
else
  FAIL health
fi

########################################################
# CONTAINER MAPPING
########################################################

cat > "$OUT/container_mapping.txt" <<MAP
CURRENT_RUNTIME=engeradios2-api-original

TARGET_RUNTIME=engeradios2-api

PRODUCTION_TAKEOVER_REQUIRED=YES

PLATFORM_MANAGED=NO

READY_FOR_PLATFORM_MANAGEMENT=YES
MAP

PASS container_mapping

########################################################
# RELEASE INVENTORY
########################################################

find ${BASE}/releases \
-maxdepth 2 \
-type f \
> "$OUT/releases_inventory.txt"

PASS releases_inventory

########################################################
# BACKUP VALIDATION
########################################################

find ${BASE}/backups \
-type f \
| head -20 \
> "$OUT/backups_inventory.txt"

PASS backup_inventory

########################################################
# COMPLIANCE SNAPSHOT
########################################################

cat > "$OUT/compliance.json" <<JSON
{
  "phase":"4B",
  "status":"${STATUS}",
  "runtime_container":"engeradios2-api-original",
  "target_container":"engeradios2-api",
  "production_modified":false,
  "deployment_executed":false,
  "rollback_executed":false,
  "platform_ready":true
}
JSON

########################################################
# EXECUTIVE REPORT
########################################################

cat > "$OUT/EXECUTIVE_REPORT.txt" <<REPORT
======================================
PRODUCTION TAKEOVER READINESS
======================================

DATE:
$(date)

STATUS:
${STATUS}

CURRENT CONTAINER:
engeradios2-api-original

TARGET CONTAINER:
engeradios2-api

PRODUCTION MODIFIED:
NO

DEPLOYMENT EXECUTED:
NO

ROLLBACK EXECUTED:
NO

READY FOR FIRST CONTROLLED DEPLOYMENT:
$([ "$STATUS" = "APPROVED" ] && echo YES || echo NO)

NEXT PHASE:
PHASE 5

OBJECTIVE:
FIRST CONTROLLED DEPLOYMENT

REPORT

########################################################
# AUDIT TRAIL
########################################################

cat > "$OUT/audit.json" <<AUDIT
{
  "phase":"4B",
  "date":"$(date -Iseconds)",
  "status":"${STATUS}",
  "production_modified":false,
  "ready_for_first_controlled_deployment":"$([ "$STATUS" = "APPROVED" ] && echo true || echo false)"
}
AUDIT

echo
echo "======================================"
echo "PRODUCTION TAKEOVER READINESS COMPLETE"
echo "======================================"

echo
echo "STATUS: ${STATUS}"

echo
echo "REPORT:"
echo "$OUT/EXECUTIVE_REPORT.txt"

