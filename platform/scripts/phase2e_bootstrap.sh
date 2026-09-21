#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

#####################################################
# BACKUP TRANSACIONAL
#####################################################

cat > ${BASE}/scripts/backup-runtime.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

DATE=$(date +%Y%m%d_%H%M%S)

OUT="/opt/engeradios2/platform/backups/${DATE}"

mkdir -p "$OUT"

echo "[BACKUP]"

docker inspect engeradios2-api-original \
> "$OUT/api.inspect.json"

docker inspect engeradios2-postgres \
> "$OUT/postgres.inspect.json"

docker inspect engeradios2-redis \
> "$OUT/redis.inspect.json"

cp \
/opt/engeradios2/platform/env/.env.production \
"$OUT/.env.production"

echo "$OUT"
EOT

#####################################################
# RELEASE REGISTRY
#####################################################

cat > ${BASE}/scripts/release-registry.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo

find /opt/engeradios2/platform/releases \
-maxdepth 1 \
-type d \
| sort
EOT

#####################################################
# DEPLOY PRECHECK
#####################################################

cat > ${BASE}/scripts/predeploy-check.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo "[PRECHECK]"

/opt/engeradios2/platform/scripts/validate-platform.sh

/opt/engeradios2/platform/scripts/dry-run.sh

curl \
-s \
--fail \
http://127.0.0.1:3001/api/v1/health \
>/dev/null

echo "[OK]"
EOT

#####################################################
# DEPLOY TRANSACIONAL
#####################################################

cat > ${BASE}/scripts/deploy-production.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "DEPLOY TRANSACTIONAL"
echo "================================="

echo
echo "Modo protegido"

echo
echo "Fluxo oficial:"

echo "1. predeploy-check.sh"
echo "2. backup-runtime.sh"
echo "3. release.sh"
echo "4. docker compose up"
echo "5. healthcheck.sh"
echo "6. rollback se necessario"

echo
echo "Nenhuma alteracao aplicada."
EOT

#####################################################
# ROLLBACK TRANSACIONAL
#####################################################

cat > ${BASE}/scripts/rollback-production.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "ROLLBACK TRANSACTIONAL"
echo "================================="

LAST=$(find /opt/engeradios2/platform/releases \
-maxdepth 1 \
-type d \
| sort \
| tail -1)

echo

echo "Ultima release:"
echo "$LAST"

echo
echo "Modo protegido."

echo
echo "Nenhuma alteracao aplicada."
EOT

#####################################################
# BASELINE PROD
#####################################################

cat > ${BASE}/scripts/generate-baseline.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

OUT="/opt/engeradios2/platform/reports/prod_baseline_$(date +%Y%m%d_%H%M%S).txt"

{
echo "===== CONTAINER ====="
docker ps -a | grep engeradios2-api || true

echo
echo "===== IMAGE ====="
docker inspect engeradios2-api-original \
--format '{{.Config.Image}}'

echo
echo "===== HEALTH ====="
curl -s \
http://127.0.0.1:3001/api/v1/health

} > "$OUT"

echo "$OUT"
EOT

chmod +x /opt/engeradios2/platform/scripts/*.sh

echo
echo "================================="
echo "PHASE 2E READY"
echo "================================="
