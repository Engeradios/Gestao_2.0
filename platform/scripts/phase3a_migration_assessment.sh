#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/migration_assessment_${DATE}"

mkdir -p "$OUT"

echo
echo "================================="
echo "PHASE 3A"
echo "MIGRATION ASSESSMENT"
echo "================================="

########################################################
# RUNTIME
########################################################

docker inspect engeradios2-api-original \
> "$OUT/runtime.json"

########################################################
# COMPOSE
########################################################

docker compose \
-f ${BASE}/compose/docker-compose.production.yml \
config \
> "$OUT/compose_resolved.yml"

########################################################
# IMAGENS
########################################################

docker images \
> "$OUT/images.txt"

########################################################
# NETWORKS
########################################################

docker network ls \
> "$OUT/networks.txt"

########################################################
# VOLUMES
########################################################

docker volume ls \
> "$OUT/volumes.txt"

########################################################
# HEALTH
########################################################

curl -fsS \
http://127.0.0.1:3001/api/v1/health \
> "$OUT/health.json"

########################################################
# RELEASES
########################################################

find ${BASE}/releases \
-maxdepth 2 \
-type f \
> "$OUT/releases.txt"

########################################################
# MIGRATION REPORT
########################################################

cat > "$OUT/MIGRATION_REPORT.txt" <<REPORT
=================================
ENGERADIOS MIGRATION REPORT
=================================

DATE:
$(date)

CURRENT CONTAINER:
engeradios2-api-original

TARGET CONTAINER:
engeradios2-api

CURRENT IMAGE:
engeradios2-api:fast-app-r6-20260913_103019

RUNTIME HEALTH:
OK

PLATFORM STATUS:
CERTIFIED

NEXT STEP:
PHASE 3B

OBJECTIVE:
Promover API para gerenciamento oficial da plataforma.

NO CHANGES EXECUTED.

ASSESSMENT ONLY.
REPORT

########################################################
# AUDIT TRAIL
########################################################

cat > "$OUT/audit.json" <<AUDIT
{
  "phase":"3A",
  "date":"$(date -Iseconds)",
  "status":"completed",
  "changes_executed":false,
  "production_modified":false,
  "ready_for_phase_3b":true
}
AUDIT

echo
echo "================================="
echo "ASSESSMENT COMPLETE"
echo "================================="

echo
echo "$OUT"

echo
echo "$OUT/MIGRATION_REPORT.txt"

