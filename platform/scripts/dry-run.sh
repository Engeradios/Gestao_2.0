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
