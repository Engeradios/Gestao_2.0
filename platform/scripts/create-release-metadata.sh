#!/bin/bash

set -Eeuo pipefail

REL=$(date +%Y%m%d_%H%M%S)

mkdir -p \
/opt/engeradios2/platform/releases/$REL

cat > \
/opt/engeradios2/platform/releases/$REL/release.json <<META
{
  "release":"$REL",
  "image":"engeradios2-api:fast-app-r6-20260913_103019",
  "date":"$(date -Iseconds)",
  "status":"created"
}
META

echo "$REL"
