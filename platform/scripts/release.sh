#!/bin/bash

set -Eeuo pipefail

REL=$(date +%Y%m%d_%H%M%S)

DST="/opt/engeradios2/platform/releases/${REL}"

mkdir -p "$DST"

cp -r \
/opt/engeradios2/platform/compose \
"$DST/"

cp -r \
/opt/engeradios2/platform/env \
"$DST/"

echo
echo "RELEASE CRIADA:"
echo "$REL"
