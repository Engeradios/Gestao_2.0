#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

mkdir -p \
${BASE}/releases \
${BASE}/backups \
${BASE}/reports

##################################################
# VALIDATE PLATFORM
##################################################

cat > ${BASE}/scripts/validate-platform.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo "[VALIDATION]"

test -f /opt/engeradios2/platform/env/.env.production

test -f /opt/engeradios2/platform/compose/docker-compose.production.yml

grep -q DATABASE_URL \
/opt/engeradios2/platform/env/.env.production

grep -q JWT_SECRET \
/opt/engeradios2/platform/env/.env.production

grep -q MAIL_ENCRYPTION_KEY \
/opt/engeradios2/platform/env/.env.production

echo "[OK]"
EOT

##################################################
# DRY RUN
##################################################

cat > ${BASE}/scripts/dry-run.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "DEPLOY DRY RUN"
echo "================================="

docker compose \
-f /opt/engeradios2/platform/compose/docker-compose.production.yml \
config

echo
echo "[OK]"
EOT

##################################################
# RELEASE
##################################################

cat > ${BASE}/scripts/release.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

REL=$(date +%Y%m%d_%H%M%S)

DST="/opt/engeradios2/platform/releases/${REL}"

mkdir -p "$DST"

cp -r \
/opt/engeradios2/platform/compose \
"$DST/"

cp -r \
/opt/engeradios2/platform/env \
"$DST/"

echo
echo "RELEASE CRIADA:"
echo "$REL"
EOT

##################################################
# BACKUP
##################################################

cat > ${BASE}/scripts/backup-runtime.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

D=$(date +%Y%m%d_%H%M%S)

OUT=/opt/engeradios2/platform/backups/$D

mkdir -p "$OUT"

docker inspect engeradios2-api-original \
> "$OUT/api.inspect.json"

docker inspect engeradios2-postgres \
> "$OUT/postgres.inspect.json"

docker inspect engeradios2-redis \
> "$OUT/redis.inspect.json"

echo "$OUT"
EOT

##################################################
# DEPLOY PLACEHOLDER
##################################################

cat > ${BASE}/scripts/deploy-production.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "DEPLOY GOVERNADO"
echo "================================="

echo
echo "Versao atual em modo protegido."

echo "Nenhuma alteracao executada."

echo
echo "Fase seguinte habilitara deploy."
EOT

##################################################
# ROLLBACK PLACEHOLDER
##################################################

cat > ${BASE}/scripts/rollback-production.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "ROLLBACK GOVERNADO"
echo "================================="

echo
echo "Rollback sera habilitado apos"
echo "primeiro deploy oficial."
EOT

chmod +x ${BASE}/scripts/*.sh

echo
echo "================================="
echo "PHASE 2D READY"
echo "================================="
