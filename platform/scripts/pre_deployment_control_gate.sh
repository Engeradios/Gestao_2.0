#!/bin/bash

set -Eeuo pipefail

DATE=$(date +%Y%m%d_%H%M%S)

OUT="/opt/engeradios2/platform/reports/pre_deployment_gate_${DATE}"

mkdir -p "$OUT"

echo
echo "======================================"
echo "PRE DEPLOYMENT CONTROL GATE"
echo "======================================"

########################################################
# HEALTH
########################################################

curl -fsS \
http://127.0.0.1:3001/api/v1/health \
| tee "$OUT/health.json"

########################################################
# CONTAINERS
########################################################

docker ps --format \
'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' \
| tee "$OUT/containers.txt"

########################################################
# API IMAGE
########################################################

docker inspect engeradios2-api-original \
--format '{{.Config.Image}}' \
| tee "$OUT/runtime_image.txt"

########################################################
# COMPOSE VALIDATION
########################################################

docker compose \
-f /opt/engeradios2/platform/compose/docker-compose.production.yml \
config \
> "$OUT/compose_resolved.yml"

########################################################
# PORT CHECK
########################################################

ss -tulpn \
| grep ':3001' \
| tee "$OUT/port_3001.txt"

########################################################
# NETWORKS
########################################################

docker network ls \
| tee "$OUT/networks.txt"

########################################################
# RELEASES
########################################################

find /opt/engeradios2/platform/releases \
-maxdepth 2 \
-type f \
| tee "$OUT/releases.txt"

########################################################
# DECISION
########################################################

cat > "$OUT/GO_LIVE_CHECKLIST.txt" <<REPORT
======================================
GO LIVE CHECKLIST
======================================

[ ] Healthcheck OK

[ ] Runtime OK

[ ] Compose OK

[ ] Porta 3001 ativa

[ ] Banco saudável

[ ] Redis saudável

[ ] Backup confirmado

[ ] Release registrada

[ ] Janela de mudança ativa

[ ] Responsável presente

PRODUÇÃO MODIFICADA:
NÃO

REPORT

echo
echo "======================================"
echo "GATE COMPLETED"
echo "======================================"

echo
echo "$OUT"

