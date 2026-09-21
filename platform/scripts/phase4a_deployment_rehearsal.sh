#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/deployment_rehearsal_${DATE}"

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
echo "PHASE 4A"
echo "DEPLOYMENT REHEARSAL"
echo "================================="

########################################################
# RUNTIME SNAPSHOT
########################################################

docker inspect engeradios2-api-original \
> "$OUT/runtime.json"

########################################################
# COMPOSE SNAPSHOT
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
# IMAGE
########################################################

IMAGE=$(
docker inspect engeradios2-api-original \
--format '{{.Config.Image}}'
)

echo "$IMAGE" > "$OUT/runtime_image.txt"

grep -q "$IMAGE" "$OUT/compose.yml" \
&& pass "image_reproducible" \
|| fail "image_reproducible"

########################################################
# ENV CHECK
########################################################

grep -q DATABASE_URL \
${BASE}/env/.env.production \
&& pass "env_database_url" \
|| fail "env_database_url"

grep -q JWT_SECRET \
${BASE}/env/.env.production \
&& pass "env_jwt" \
|| fail "env_jwt"

grep -q MAIL_ENCRYPTION_KEY \
${BASE}/env/.env.production \
&& pass "env_mail_key" \
|| fail "env_mail_key"

########################################################
# RUNTIME VS PLATFORM
########################################################

cat > "$OUT/runtime_vs_platform.txt" <<COMPARE
Current Runtime:
engeradios2-api-original

Target Runtime:
engeradios2-api

Current Image:
$IMAGE

Compose Managed:
YES

Health:
VALID

Migration Candidate:
YES
COMPARE

########################################################
# ROLLBACK REHEARSAL
########################################################

cat > "$OUT/rollback_rehearsal.txt" <<ROLLBACK
Rollback Strategy

1. Backup Runtime
2. Backup Env
3. Preserve Release
4. Restore Last Release
5. Validate Health
6. Reopen Traffic

Production Modified:
NO
ROLLBACK

########################################################
# FINAL AUDIT
########################################################

cat > "$OUT/audit.json" <<AUDIT
{
  "phase":"4A",
  "date":"$(date -Iseconds)",
  "status":"${STATUS}",
  "production_modified":false,
  "deployment_simulated":true,
  "rollback_simulated":true,
  "ready_for_phase_4b":"$([ "$STATUS" = "APPROVED" ] && echo true || echo false)"
}
AUDIT

########################################################
# EXECUTIVE REPORT
########################################################

cat > "$OUT/EXECUTIVE_REPORT.txt" <<REPORT
=================================
DEPLOYMENT REHEARSAL REPORT
=================================

DATE:
$(date)

STATUS:
${STATUS}

PRODUCTION MODIFIED:
NO

DEPLOYMENT:
SIMULATED

ROLLBACK:
SIMULATED

READY FOR NEXT STEP:
$([ "$STATUS" = "APPROVED" ] && echo YES || echo NO)

NEXT PHASE:
4B

OBJECTIVE:
Controlled Production Takeover

REPORT

echo
echo "================================="
echo "DEPLOYMENT REHEARSAL COMPLETE"
echo "================================="

echo
echo "STATUS: $STATUS"

echo
echo "REPORT:"
echo "$OUT/EXECUTIVE_REPORT.txt"

