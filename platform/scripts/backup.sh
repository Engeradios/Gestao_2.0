#!/bin/bash

set -Eeuo pipefail

DEST=/opt/engeradios2/platform/backups/$(date +%Y%m%d_%H%M%S)

mkdir -p "$DEST"

docker inspect engeradios2-api-original \
> "$DEST/api.inspect.json" \
2>/dev/null || true

docker inspect engeradios2-postgres \
> "$DEST/postgres.inspect.json" \
2>/dev/null || true

docker inspect engeradios2-redis \
> "$DEST/redis.inspect.json" \
2>/dev/null || true

echo "$DEST"
