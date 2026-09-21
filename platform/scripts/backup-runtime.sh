#!/bin/bash

set -Eeuo pipefail

DATE=$(date +%Y%m%d_%H%M%S)

OUT="/opt/engeradios2/platform/backups/${DATE}"

mkdir -p "$OUT"

echo "[BACKUP]"

docker inspect engeradios2-api-original \
> "$OUT/api.inspect.json"

docker inspect engeradios2-postgres \
> "$OUT/postgres.inspect.json"

docker inspect engeradios2-redis \
> "$OUT/redis.inspect.json"

cp \
/opt/engeradios2/platform/env/.env.production \
"$OUT/.env.production"

echo "$OUT"
