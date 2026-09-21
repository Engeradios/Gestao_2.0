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
