#!/bin/bash

set -Eeuo pipefail

echo "[PRECHECK]"

/opt/engeradios2/platform/scripts/validate-platform.sh

/opt/engeradios2/platform/scripts/dry-run.sh

curl \
-s \
--fail \
http://127.0.0.1:3001/api/v1/health \
>/dev/null

echo "[OK]"
