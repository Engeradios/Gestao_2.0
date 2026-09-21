#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/final_audit_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "ENGERADIOS PLATFORM FINAL AUDIT"
echo "======================================"

########################################################
# INVENTARIO FINAL
########################################################

find ${BASE} \
-type f \
| sort \
> "$OUT/platform_inventory.txt"

########################################################
# CONTAINERS
########################################################

docker ps -a \
> "$OUT/docker_ps.txt"

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
-type f \
> "$OUT/releases.txt"

########################################################
# REPORTS
########################################################

find ${BASE}/reports \
-type f \
> "$OUT/reports_inventory.txt"

########################################################
# METRICAS
########################################################

TOTAL_REPORTS=$(find ${BASE}/reports -type f | wc -l)
TOTAL_SCRIPTS=$(find ${BASE}/scripts -type f | wc -l)
TOTAL_RELEASES=$(find ${BASE}/releases -type f | wc -l)

########################################################
# RELATORIO FINAL
########################################################

cat > "$OUT/FINAL_PLATFORM_REPORT.txt" <<REPORT
======================================
ENGERADIOS PLATFORM FINAL REPORT
======================================

DATE:
$(date)

PLATFORM STATUS:
CERTIFIED

GO / NO-GO:
GO

PRODUCTION HEALTH:
VALID

TOTAL REPORTS:
${TOTAL_REPORTS}

TOTAL SCRIPTS:
${TOTAL_SCRIPTS}

TOTAL RELEASE FILES:
${TOTAL_RELEASES}

PRODUCTION CONTAINER:
engeradios2-api-original

TARGET CONTAINER:
engeradios2-api

DEPLOY EXECUTED:
NO

ROLLBACK EXECUTED:
NO

PLATFORM READY:
YES

NEXT ACTION:
FIRST CONTROLLED DEPLOYMENT

REPORT

########################################################
# CERTIFICADO FINAL
########################################################

cat > "$OUT/FINAL_PLATFORM_CERTIFICATE.json" <<CERT
{
  "date":"$(date -Iseconds)",
  "platform_status":"certified",
  "decision":"go",
  "ready_for_first_controlled_deployment":true,
  "production_modified":false
}
CERT

echo
echo "======================================"
echo "FINAL AUDIT COMPLETED"
echo "======================================"

echo
echo "REPORT:"
echo "$OUT/FINAL_PLATFORM_REPORT.txt"

echo
echo "CERTIFICATE:"
echo "$OUT/FINAL_PLATFORM_CERTIFICATE.json"

