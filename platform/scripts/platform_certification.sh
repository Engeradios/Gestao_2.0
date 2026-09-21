#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

REPORT_DIR="${BASE}/reports/certification_${DATE}"

mkdir -p "${REPORT_DIR}"

STATUS="APPROVED"

PASS() {
  echo "[PASS] $1"
}

FAIL() {
  echo "[FAIL] $1"
  STATUS="FAILED"
}

########################################################
# CHECK FILE
########################################################

check_file() {

  if [ -f "$1" ]; then
      PASS "$1"
  else
      FAIL "$1"
  fi

}

########################################################
# CHECK DIR
########################################################

check_dir() {

  if [ -d "$1" ]; then
      PASS "$1"
  else
      FAIL "$1"
  fi

}

########################################################
# GOVERNANCA
########################################################

{
echo "================================="
echo "PLATFORM CERTIFICATION"
echo "================================="
echo
} > "${REPORT_DIR}/certification.log"

echo "[1] GOVERNANCA"

check_dir "${BASE}/compose" \
| tee -a "${REPORT_DIR}/certification.log"

check_dir "${BASE}/env" \
| tee -a "${REPORT_DIR}/certification.log"

check_dir "${BASE}/scripts" \
| tee -a "${REPORT_DIR}/certification.log"

check_dir "${BASE}/releases" \
| tee -a "${REPORT_DIR}/certification.log"

check_dir "${BASE}/reports" \
| tee -a "${REPORT_DIR}/certification.log"

########################################################
# ENV
########################################################

echo "[2] ENV"

check_file "${BASE}/env/.env.production" \
| tee -a "${REPORT_DIR}/certification.log"

check_file "${BASE}/env/.env.production.template" \
| tee -a "${REPORT_DIR}/certification.log"

check_file "${BASE}/env/.env.schema" \
| tee -a "${REPORT_DIR}/certification.log"

########################################################
# COMPOSE
########################################################

echo "[3] COMPOSE"

check_file "${BASE}/compose/docker-compose.production.yml" \
| tee -a "${REPORT_DIR}/certification.log"

########################################################
# SCRIPTS
########################################################

echo "[4] SCRIPTS"

for s in \
validation.sh \
healthcheck.sh \
release.sh \
deploy.sh \
rollback.sh \
platform_status.sh \
generate_manifest.sh \
extract_runtime_env.sh
do

  if [ -x "${BASE}/scripts/${s}" ]; then
      PASS "$s"
  else
      FAIL "$s"
  fi

done | tee -a "${REPORT_DIR}/certification.log"

########################################################
# DOCKER
########################################################

echo "[5] DOCKER"

docker version \
>/dev/null 2>&1 \
&& PASS docker \
|| FAIL docker

docker compose version \
>/dev/null 2>&1 \
&& PASS compose \
|| FAIL compose

########################################################
# NETWORKS
########################################################

echo "[6] NETWORKS"

docker network inspect engeradios2_backend \
>/dev/null 2>&1 \
&& PASS engeradios2_backend \
|| FAIL engeradios2_backend

docker network inspect engeradios2_edge \
>/dev/null 2>&1 \
&& PASS engeradios2_edge \
|| FAIL engeradios2_edge

########################################################
# VOLUMES
########################################################

echo "[7] STORAGE"

for d in \
/opt/engeradios2/storage/propostas \
/opt/engeradios2/storage/servicos \
/var/lib/engeradios2/contratos \
/var/lib/engeradios2/perfis \
/opt/engeradios2/storage/app-campo/evidencias \
/opt/engeradios2/storage/orcamento/evidencias
do

  if [ -d "$d" ]; then
      PASS "$d"
  else
      FAIL "$d"
  fi

done | tee -a "${REPORT_DIR}/certification.log"

########################################################
# API
########################################################

echo "[8] API"

docker image inspect \
engeradios2-api:fast-app-r6-20260913_103019 \
>/dev/null 2>&1 \
&& PASS api_image \
|| FAIL api_image

########################################################
# HEALTH
########################################################

echo "[9] HEALTH"

curl -fsS \
http://127.0.0.1:3001/api/v1/health \
>/dev/null 2>&1 \
&& PASS api_health \
|| FAIL api_health

########################################################
# SOURCE OF TRUTH
########################################################

echo "[10] SOURCE OF TRUTH"

check_file \
"${BASE}/reports/deployment_source_of_truth.json" \
| tee -a "${REPORT_DIR}/certification.log"

########################################################
# MANIFEST
########################################################

echo "[11] MANIFEST"

find "${BASE}/reports" \
-name 'platform_manifest*.json' \
| grep -q .

if [ $? -eq 0 ]; then
  PASS manifest
else
  FAIL manifest
fi

########################################################
# JSON FINAL
########################################################

cat > "${REPORT_DIR}/platform_certification.json" <<JSON
{
  "date":"$(date -Iseconds)",
  "status":"${STATUS}",
  "platform":"Engeradios Platform",
  "phase":"2G",
  "ready_for_phase_3":"$([ "$STATUS" = "APPROVED" ] && echo true || echo false)"
}
JSON

########################################################
# RESUMO FINAL
########################################################

cat > "${REPORT_DIR}/platform_certification_report.txt" <<TXT
=================================
ENGERADIOS PLATFORM CERTIFICATION
=================================

DATE: $(date)

STATUS: ${STATUS}

REPORT_DIR:
${REPORT_DIR}

JSON:
${REPORT_DIR}/platform_certification.json

READY FOR PHASE 3:
$([ "$STATUS" = "APPROVED" ] && echo YES || echo NO)

TXT

echo
echo "================================="
echo "CERTIFICATION FINISHED"
echo "================================="

echo
echo "STATUS: ${STATUS}"

echo
echo "REPORT:"
echo "${REPORT_DIR}/platform_certification_report.txt"

echo
echo "JSON:"
echo "${REPORT_DIR}/platform_certification.json"

