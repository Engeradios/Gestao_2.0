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
