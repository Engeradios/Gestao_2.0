#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "PLATFORM STATUS"
echo "================================="

echo
echo "[CONTAINERS]"
docker ps -a \
--format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo
echo "[IMAGES]"
docker images | grep engeradios2-api || true

echo
echo "[COMPOSE]"
ls -lh /opt/engeradios2/platform/compose/

echo
echo "[ENV]"
ls -lh /opt/engeradios2/platform/env/

echo
echo "[SCRIPTS]"
ls -lh /opt/engeradios2/platform/scripts/

echo
echo "[RELEASES]"
find /opt/engeradios2/platform/releases \
-maxdepth 1 \
-type d

echo
echo "[HEALTH]"

curl \
-s \
http://127.0.0.1:3001/api/v1/health \
|| true

echo
echo "================================="
echo "STATUS OK"
echo "================================="
