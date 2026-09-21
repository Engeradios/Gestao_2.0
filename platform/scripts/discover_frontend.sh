#!/bin/bash

set -Eeuo pipefail

OUT="/opt/engeradios2/platform/reports/frontend_discovery_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$OUT"

docker ps -a > "$OUT/docker_ps.txt"

ss -tulpn > "$OUT/listening_ports.txt" || true

find /opt \
-type f \
\( \
-name package.json \
-o -name next.config.js \
-o -name vite.config.* \
-o -name angular.json \
\) 2>/dev/null \
> "$OUT/frontend_files.txt"

grep -R "gestao.engeradios.com.br" /etc/nginx 2>/dev/null \
> "$OUT/nginx_domain_refs.txt" || true

curl -I https://gestao.engeradios.com.br \
> "$OUT/site_headers.txt" 2>&1 || true

echo "REPORT: $OUT"
