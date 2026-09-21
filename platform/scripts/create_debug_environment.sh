#!/bin/bash

set -Eeuo pipefail

echo
echo "======================================"
echo "CREATE DEBUG ENVIRONMENT"
echo "======================================"

DEBUG_NAME="engeradios2-api-debug"

#####################################################
# REMOVE DEBUG ANTIGO
#####################################################

docker rm -f ${DEBUG_NAME} 2>/dev/null || true

#####################################################
# CREATE DEBUG
#####################################################

docker run -d \
  --name ${DEBUG_NAME} \
  --restart unless-stopped \
  -p 127.0.0.1:3002:3001 \
  --network engeradios2_backend \
  --network-alias api-debug \
  -e DATABASE_URL="postgresql://engeradios_app:ZDj%2BBSBuZFM9WDG7IPrQ1eCbarWlSNoDMVQUJzAqj8AMGBG8yiU2G%2Bs%2FIEwO9xUE@engeradios2-postgres:5432/engeradios2_novo?schema=public" \
  -e HOST="0.0.0.0" \
  -e PORT="3001" \
  -e NODE_ENV="production" \
  -e JWT_EXPIRES_IN="15m" \
  -e JWT_SECRET="51cd8019cad7cdcdf6b4517266482cc73b0d58430db5908c2f81ee853e6cece944b13c7a5314d98efbc45db615ed6446f9c7d88fffa05a59f44f75eabadca2da" \
  -e PUBLIC_APP_URL="https://gestao.engeradios.com.br" \
  -e MAIL_ENCRYPTION_KEY="c150f931cc2891237d6349dcc2da6a1c205f68df391d1416577a07ab8dcc7a1b" \
  -v /opt/engeradios2/storage/propostas:/opt/engeradios2/storage/propostas:rw \
  -v /opt/engeradios2/storage/servicos:/opt/engeradios2/storage/servicos:rw \
  -v /var/lib/engeradios2/contratos:/var/lib/engeradios2/contratos:rw \
  -v /var/lib/engeradios2/perfis:/var/lib/engeradios2/perfis:rw \
  -v /opt/engeradios2/storage/app-campo/evidencias:/opt/engeradios2/storage/app-campo/evidencias:rw \
  -v /opt/engeradios2/storage/orcamento/evidencias:/opt/engeradios2/storage/orcamento/evidencias:rw \
  engeradios2-api:fast-app-r6-20260913_103019

#####################################################
# WAIT
#####################################################

sleep 15

#####################################################
# HEALTH
#####################################################

echo
echo "Health:"

curl -s http://127.0.0.1:3002/api/v1/health || true

echo
echo "Container:"

docker ps \
--filter name=${DEBUG_NAME}

echo
echo "Logs:"

docker logs --tail=50 ${DEBUG_NAME}

