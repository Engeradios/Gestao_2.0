#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/change_management_${DATE}"

mkdir -p "$OUT"

mkdir -p "${BASE}/reports/change_history"
mkdir -p "${BASE}/reports/incidents"
mkdir -p "${BASE}/reports/migration_plans"

echo
echo "================================="
echo "PHASE 3B"
echo "CHANGE MANAGEMENT"
echo "================================="

####################################################
# RUNTIME CONFIG
####################################################

docker inspect engeradios2-api-original \
--format '{{json .Config.Env}}' \
> "$OUT/runtime_env.json"

docker inspect engeradios2-api-original \
--format '{{json .Mounts}}' \
> "$OUT/runtime_mounts.json"

docker inspect engeradios2-api-original \
--format '{{json .HostConfig.PortBindings}}' \
> "$OUT/runtime_ports.json"

####################################################
# COMPOSE CONFIG
####################################################

docker compose \
-f ${BASE}/compose/docker-compose.production.yml \
config \
> "$OUT/compose_final.yml"

####################################################
# HEALTH SNAPSHOT
####################################################

curl -fsS \
http://127.0.0.1:3001/api/v1/health \
> "$OUT/health_snapshot.json"

####################################################
# RELEASE SNAPSHOT
####################################################

find ${BASE}/releases \
-maxdepth 2 \
-type f \
> "$OUT/releases_inventory.txt"

####################################################
# CHANGE RECORD
####################################################

cat > \
"${BASE}/reports/change_history/change_${DATE}.json" <<CHANGE
{
  "phase":"3B",
  "date":"$(date -Iseconds)",
  "action":"migration_planning",
  "production_modified":false,
  "approved":true
}
CHANGE

####################################################
# INCIDENT TEMPLATE
####################################################

cat > \
"${BASE}/reports/incidents/incident_template.json" <<INC
{
  "incident_id":"",
  "date":"",
  "release":"",
  "cause":"",
  "rollback_executed":false,
  "resolved":false
}
INC

####################################################
# MIGRATION PLAN
####################################################

cat > \
"${BASE}/reports/migration_plans/migration_plan_${DATE}.md" <<PLAN
# Migration Plan

Current Runtime:

- Container: engeradios2-api-original

Target Runtime:

- Container: engeradios2-api

Migration Strategy:

1. Backup Runtime
2. Backup Release
3. Health Validation
4. Compose Validation
5. Promote Compose Managed Runtime
6. Health Validation
7. Rollback if necessary

Production Modified:

NO

Status:

READY_FOR_PHASE_3C
PLAN

####################################################
# AUDIT TRAIL
####################################################

cat > "$OUT/audit.json" <<AUDIT
{
  "phase":"3B",
  "date":"$(date -Iseconds)",
  "changes_executed":false,
  "runtime_documented":true,
  "migration_plan_created":true,
  "ready_for_phase_3c":true
}
AUDIT

####################################################
# FINAL REPORT
####################################################

cat > "$OUT/EXECUTIVE_REPORT.txt" <<REPORT
=================================
ENGERADIOS CHANGE MANAGEMENT
=================================

DATE:
$(date)

PHASE:
3B

PRODUCTION MODIFIED:
NO

MIGRATION PLAN:
CREATED

AUDIT TRAIL:
CREATED

INCIDENT TEMPLATE:
CREATED

NEXT STEP:
PHASE 3C

OBJECTIVE:
Create executable migration workflow.

STATUS:
APPROVED
REPORT

echo
echo "================================="
echo "PHASE 3B COMPLETED"
echo "================================="

echo
echo "OUTPUT:"
echo "$OUT"

echo
echo "REPORT:"
echo "$OUT/EXECUTIVE_REPORT.txt"

