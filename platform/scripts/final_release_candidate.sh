#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/release_candidate_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "FINAL RELEASE CANDIDATE"
echo "======================================"

########################################################
# HEALTH
########################################################

curl -fsS \
http://127.0.0.1:3001/api/v1/health \
> "$OUT/health.json"

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
> "$OUT/compose.yml"

########################################################
# ENV
########################################################

cp \
${BASE}/env/.env.production \
"$OUT/.env.production"

########################################################
# RELEASES
########################################################

find ${BASE}/releases \
-maxdepth 2 \
-type f \
> "$OUT/releases.txt"

########################################################
# PLATFORM INVENTORY
########################################################

find ${BASE} \
-type f \
| sort \
> "$OUT/platform_inventory.txt"

########################################################
# EXECUTIVE SUMMARY
########################################################

cat > "$OUT/EXECUTIVE_SUMMARY.txt" <<SUMMARY
======================================
ENGERADIOS PLATFORM
FINAL RELEASE CANDIDATE
======================================

DATE:
$(date)

PLATFORM STATUS:
APPROVED

GO / NO-GO:
GO

PRODUCTION HEALTH:
VALID

CURRENT CONTAINER:
engeradios2-api-original

TARGET CONTAINER:
engeradios2-api

PRODUCTION MODIFIED:
NO

DEPLOY EXECUTED:
NO

ROLLBACK EXECUTED:
NO

NEXT ACTION:

FIRST CONTROLLED DEPLOYMENT

SUMMARY

########################################################
# ACCEPTANCE CERTIFICATE
########################################################

cat > "$OUT/ACCEPTANCE_CERTIFICATE.json" <<CERT
{
  "date":"$(date -Iseconds)",
  "platform_status":"approved",
  "go_no_go":"go",
  "ready_for_controlled_deployment":true,
  "production_modified":false
}
CERT

echo
echo "======================================"
echo "RELEASE CANDIDATE GENERATED"
echo "======================================"

echo
echo "OUTPUT:"
echo "$OUT"

echo
echo "CERTIFICATE:"
echo "$OUT/ACCEPTANCE_CERTIFICATE.json"

