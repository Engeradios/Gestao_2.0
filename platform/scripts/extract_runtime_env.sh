#!/bin/bash

set -Eeuo pipefail

REPORT_DIR="/opt/engeradios2/platform/reports"
DATE=$(date +%Y%m%d_%H%M%S)

OUT="${REPORT_DIR}/runtime_env_${DATE}"

mkdir -p "${OUT}"

API="engeradios2-api-original"

echo "[1] Extraindo variaveis do container"

docker inspect "$API" \
--format '{{range .Config.Env}}{{println .}}{{end}}' \
| sort > "${OUT}/container.env"

echo "[2] Extraindo arquivo .env da aplicacao"

cp \
/opt/engeradios2/apps/api/.env \
"${OUT}/app.env" \
2>/dev/null || true

echo "[3] Gerando comparativo"

{
echo "===================================="
echo "CONTAINER ENV"
echo "===================================="
cat "${OUT}/container.env"

echo
echo "===================================="
echo "APP ENV"
echo "===================================="

cat "${OUT}/app.env" 2>/dev/null || true

} > "${OUT}/comparison.txt"

echo
echo "===================================="
echo "RUNTIME ENV EXTRAIDO"
echo "===================================="

echo "${OUT}"

