#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "DEPLOY TRANSACTIONAL"
echo "================================="

echo
echo "Modo protegido"

echo
echo "Fluxo oficial:"

echo "1. predeploy-check.sh"
echo "2. backup-runtime.sh"
echo "3. release.sh"
echo "4. docker compose up"
echo "5. healthcheck.sh"
echo "6. rollback se necessario"

echo
echo "Nenhuma alteracao aplicada."
