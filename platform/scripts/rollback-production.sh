#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "ROLLBACK TRANSACTIONAL"
echo "================================="

LAST=$(find /opt/engeradios2/platform/releases \
-maxdepth 1 \
-type d \
| sort \
| tail -1)

echo

echo "Ultima release:"
echo "$LAST"

echo
echo "Modo protegido."

echo
echo "Nenhuma alteracao aplicada."
