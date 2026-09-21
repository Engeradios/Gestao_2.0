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
