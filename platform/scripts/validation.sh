#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "VALIDACAO DE PLATAFORMA"
echo "================================="

test -f /opt/engeradios2/platform/env/.env.production

test -f /opt/engeradios2/platform/compose/docker-compose.production.yml

grep -q MAIL_ENCRYPTION_KEY \
/opt/engeradios2/platform/env/.env.production

grep -q JWT_SECRET \
/opt/engeradios2/platform/env/.env.production

grep -q DATABASE_URL \
/opt/engeradios2/platform/env/.env.production

echo
echo "[OK] VALIDACAO CONCLUIDA"
