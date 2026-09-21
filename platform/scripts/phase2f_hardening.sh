#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

#################################################
# ENV SCHEMA
#################################################

cat > ${BASE}/env/.env.schema <<'EOT'
DATABASE_URL

HOST

PORT

NODE_ENV

JWT_SECRET

JWT_EXPIRES_IN

PUBLIC_APP_URL

MAIL_ENCRYPTION_KEY
EOT

#################################################
# DEPLOY LOCK
#################################################

cat > ${BASE}/scripts/deploy-lock.sh <<'EOT'
#!/bin/bash

LOCK=/tmp/engeradios_platform_deploy.lock

if [ -f "$LOCK" ]; then
    echo "DEPLOY EM EXECUCAO"
    exit 1
fi

touch "$LOCK"

echo "$LOCK"
EOT

#################################################
# DEPLOY UNLOCK
#################################################

cat > ${BASE}/scripts/deploy-unlock.sh <<'EOT'
#!/bin/bash

rm -f /tmp/engeradios_platform_deploy.lock
EOT

#################################################
# PLATFORM READINESS
#################################################

cat > ${BASE}/scripts/platform-readiness.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "READINESS CHECK"
echo "================================="

echo
echo "[ENV]"
test -f /opt/engeradios2/platform/env/.env.production

echo OK

echo
echo "[COMPOSE]"
test -f /opt/engeradios2/platform/compose/docker-compose.production.yml

echo OK

echo
echo "[NETWORK]"

docker network inspect engeradios2_backend >/dev/null

docker network inspect engeradios2_edge >/dev/null

echo OK

echo
echo "[IMAGE]"

docker image inspect \
engeradios2-api:fast-app-r6-20260913_103019 \
>/dev/null

echo OK

echo
echo "[PORT]"

ss -tulpn | grep 3001 >/dev/null

echo OK

echo
echo "[HEALTH]"

curl -fsS \
http://127.0.0.1:3001/api/v1/health \
>/dev/null

echo OK

echo
echo "================================="
echo "PLATFORM READY"
echo "================================="
EOT

#################################################
# RELEASE METADATA
#################################################

cat > ${BASE}/scripts/create-release-metadata.sh <<'EOT'
#!/bin/bash

set -Eeuo pipefail

REL=$(date +%Y%m%d_%H%M%S)

mkdir -p \
/opt/engeradios2/platform/releases/$REL

cat > \
/opt/engeradios2/platform/releases/$REL/release.json <<META
{
  "release":"$REL",
  "image":"engeradios2-api:fast-app-r6-20260913_103019",
  "date":"$(date -Iseconds)",
  "status":"created"
}
META

echo "$REL"
EOT

chmod +x ${BASE}/scripts/*.sh

echo
echo "================================="
echo "PHASE 2F READY"
echo "================================="
