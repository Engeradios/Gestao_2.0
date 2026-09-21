#!/bin/bash

set -Eeuo pipefail

echo
echo "================================="
echo "HEALTHCHECK"
echo "================================="

curl \
--silent \
--fail \
http://127.0.0.1:3001/api/v1/health

echo
echo "[OK] API RESPONDENDO"
