#!/bin/bash

set -Eeuo pipefail

BASE="/opt/engeradios2/platform"

DATE=$(date +%Y%m%d_%H%M%S)

OUT="${BASE}/reports/change_window_${DATE}"

mkdir -p "$OUT"

cat > "$OUT/CHANGE_WINDOW.txt" <<REPORT
======================================
CHANGE WINDOW STARTED
======================================

DATE:
$(date)

PLATFORM STATUS:
CERTIFIED

GO/NO-GO:
GO

CURRENT CONTAINER:
engeradios2-api-original

TARGET CONTAINER:
engeradios2-api

PRODUCTION MODIFIED:
NO

CHANGE FREEZE:
ENABLED

NEXT PHASE:
FIRST CONTROLLED DEPLOYMENT
REPORT

echo
echo "CHANGE WINDOW REGISTERED"
echo
echo "$OUT/CHANGE_WINDOW.txt"

