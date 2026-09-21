#!/bin/bash

set -Eeuo pipefail

ROOT="/opt/engeradios2/governance"
DATE=$(date +%Y%m%d_%H%M%S)

OUT="${ROOT}/reports/${DATE}_deployment_blueprint"

mkdir -p "${OUT}"

echo "========================================="
echo "FASE 1B - DEPLOYMENT BLUEPRINT AUDIT"
echo "========================================="

#############################################
# DETECTAR API PRODUTIVA
#############################################

API_CONTAINER=""

for c in $(docker ps --format '{{.Names}}')
do
    if docker inspect "$c" \
        --format '{{json .HostConfig.PortBindings}}' 2>/dev/null \
        | grep -q '3001'
    then
        API_CONTAINER="$c"
        break
    fi
done

echo "API_CONTAINER=${API_CONTAINER}" \
> "${OUT}/detected_api.txt"

#############################################
# INSPECT COMPLETO
#############################################

docker inspect "${API_CONTAINER}" \
> "${OUT}/api.inspect.full.json"

#############################################
# IMAGEM
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{.Config.Image}}' \
> "${OUT}/image.txt"

#############################################
# CMD
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .Config.Cmd}}' \
> "${OUT}/cmd.json"

#############################################
# ENTRYPOINT
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .Config.Entrypoint}}' \
> "${OUT}/entrypoint.json"

#############################################
# RESTART POLICY
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .HostConfig.RestartPolicy}}' \
> "${OUT}/restart_policy.json"

#############################################
# PORTAS
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .HostConfig.PortBindings}}' \
> "${OUT}/ports.json"

#############################################
# REDES
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .NetworkSettings.Networks}}' \
> "${OUT}/networks.json"

#############################################
# MOUNTS
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .Mounts}}' \
> "${OUT}/mounts.json"

#############################################
# ENV
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .Config.Env}}' \
> "${OUT}/env.json"

#############################################
# LABELS
#############################################

docker inspect "${API_CONTAINER}" \
--format '{{json .Config.Labels}}' \
> "${OUT}/labels.json"

#############################################
# PORTAS ABERTAS
#############################################

docker exec "${API_CONTAINER}" \
sh -c 'ss -tulpn || netstat -tulpn' \
> "${OUT}/container_ports.txt" \
2>&1 || true

#############################################
# VOLUMES MAPEADOS
#############################################

docker inspect "${API_CONTAINER}" \
| grep Source \
> "${OUT}/volume_sources.txt" \
2>/dev/null || true

#############################################
# REDES EXISTENTES
#############################################

docker network ls \
> "${OUT}/network_inventory.txt"

#############################################
# VOLUMES EXISTENTES
#############################################

docker volume ls \
> "${OUT}/volume_inventory.txt"

#############################################
# IMAGENS DA API
#############################################

docker images | grep engeradios2-api \
> "${OUT}/api_images.txt"

#############################################
# CONTAINERS HISTORICOS
#############################################

docker ps -a \
--format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' \
| grep engeradios2-api \
> "${OUT}/api_history.txt"

#############################################
# COMPOSE CANDIDATOS
#############################################

find /opt \
-type f \
\( -name "*.yml" -o -name "*.yaml" \) \
> "${OUT}/compose_candidates.txt" \
2>/dev/null || true

#############################################
# ENV CANDIDATOS
#############################################

find /opt \
-type f \
-name ".env*" \
> "${OUT}/env_candidates.txt" \
2>/dev/null || true

#############################################
# BLUEPRINT RESUMIDO
#############################################

{
echo "================================="
echo "DEPLOYMENT BLUEPRINT"
echo "================================="

echo
echo "API DETECTADA:"
cat "${OUT}/detected_api.txt"

echo
echo "IMAGEM:"
cat "${OUT}/image.txt"

echo
echo "PORTAS:"
cat "${OUT}/ports.json"

echo
echo "RESTART POLICY:"
cat "${OUT}/restart_policy.json"

echo
echo "REDES:"
cat "${OUT}/networks.json"

echo
echo "MOUNTS:"
cat "${OUT}/mounts.json"

} > "${OUT}/BLUEPRINT_SUMMARY.txt"

echo
echo "========================================="
echo "BLUEPRINT GERADO"
echo "========================================="

echo
echo "${OUT}"
echo
echo "${OUT}/BLUEPRINT_SUMMARY.txt"

