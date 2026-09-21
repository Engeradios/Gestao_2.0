#!/bin/bash

set -Eeuo pipefail

AUDIT_ROOT="/opt/engeradios2/governance"
DATE=$(date +%Y%m%d_%H%M%S)

REPORT_DIR="${AUDIT_ROOT}/reports/${DATE}"

mkdir -p "${REPORT_DIR}"

echo "======================================="
echo " ENGERADIOS 2 - AUDITORIA FASE 1 "
echo "======================================="

echo
echo "Saida:"
echo "${REPORT_DIR}"

############################################################
# HOST
############################################################

hostnamectl > "${REPORT_DIR}/host.txt" 2>&1 || true
uname -a > "${REPORT_DIR}/kernel.txt" 2>&1 || true
uptime > "${REPORT_DIR}/uptime.txt" 2>&1 || true

############################################################
# CPU
############################################################

lscpu > "${REPORT_DIR}/cpu.txt" 2>&1 || true

############################################################
# MEMORIA
############################################################

free -m > "${REPORT_DIR}/memory.txt" 2>&1 || true

############################################################
# DISCO
############################################################

df -h > "${REPORT_DIR}/storage.txt" 2>&1 || true
lsblk > "${REPORT_DIR}/block_devices.txt" 2>&1 || true

############################################################
# REDE
############################################################

ip addr > "${REPORT_DIR}/network_interfaces.txt" 2>&1 || true
ss -tulpn > "${REPORT_DIR}/listening_ports.txt" 2>&1 || true

############################################################
# ARVORE DA APLICACAO
############################################################

find /opt/engeradios2 \
-maxdepth 6 \
> "${REPORT_DIR}/filesystem_tree.txt" 2>/dev/null || true

############################################################
# DOCKER
############################################################

docker version \
> "${REPORT_DIR}/docker_version.txt" 2>&1 || true

docker info \
> "${REPORT_DIR}/docker_info.txt" 2>&1 || true

docker ps -a \
> "${REPORT_DIR}/docker_ps.txt" 2>&1 || true

docker images \
> "${REPORT_DIR}/docker_images.txt" 2>&1 || true

docker network ls \
> "${REPORT_DIR}/docker_networks.txt" 2>&1 || true

docker volume ls \
> "${REPORT_DIR}/docker_volumes.txt" 2>&1 || true

############################################################
# CONTAINERS
############################################################

mkdir -p "${REPORT_DIR}/containers"

for c in $(docker ps -aq)
do
    docker inspect "$c" \
    > "${REPORT_DIR}/containers/${c}.json" 2>/dev/null || true
done

############################################################
# LOGS
############################################################

mkdir -p "${REPORT_DIR}/logs"

for c in $(docker ps -aq)
do
    docker logs --tail 500 "$c" \
    > "${REPORT_DIR}/logs/${c}.log" 2>&1 || true
done

############################################################
# REDES
############################################################

mkdir -p "${REPORT_DIR}/networks"

for n in $(docker network ls --format '{{.Name}}')
do
    docker network inspect "$n" \
    > "${REPORT_DIR}/networks/${n}.json" 2>/dev/null || true
done

############################################################
# VOLUMES
############################################################

mkdir -p "${REPORT_DIR}/volumes"

for v in $(docker volume ls -q)
do
    docker volume inspect "$v" \
    > "${REPORT_DIR}/volumes/${v}.json" 2>/dev/null || true
done

############################################################
# COMPOSE FILES
############################################################

find /opt \
-type f \
\( -name "*.yml" -o -name "*.yaml" \) \
> "${REPORT_DIR}/compose_files.txt" 2>/dev/null || true

############################################################
# ENV FILES
############################################################

find /opt \
-type f \
-name ".env*" \
> "${REPORT_DIR}/env_files.txt" 2>/dev/null || true

############################################################
# SHELL SCRIPTS
############################################################

find /opt \
-type f \
-name "*.sh" \
> "${REPORT_DIR}/scripts.txt" 2>/dev/null || true

############################################################
# PORTAS PUBLICADAS
############################################################

docker ps \
--format 'table {{.Names}}\t{{.Ports}}' \
> "${REPORT_DIR}/published_ports.txt" 2>&1 || true

############################################################
# VARIAVEIS DOS CONTAINERS
############################################################

mkdir -p "${REPORT_DIR}/env"

for c in $(docker ps -aq)
do
    docker inspect "$c" \
    --format '{{json .Config.Env}}' \
    > "${REPORT_DIR}/env/${c}.json" 2>/dev/null || true
done

############################################################
# POSTGRES
############################################################

mkdir -p "${REPORT_DIR}/postgres"

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "\dt" \
> "${REPORT_DIR}/postgres/tables.txt" 2>&1 || true

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "\dn" \
> "${REPORT_DIR}/postgres/schemas.txt" 2>&1 || true

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "
SELECT
tablename
FROM pg_tables
WHERE schemaname='public'
ORDER BY tablename;
" \
> "${REPORT_DIR}/postgres/table_inventory.txt" 2>&1 || true

############################################################
# REDIS
############################################################

mkdir -p "${REPORT_DIR}/redis"

docker exec engeradios2-redis \
redis-cli INFO \
> "${REPORT_DIR}/redis/info.txt" 2>&1 || true

############################################################
# IMAGENS EM USO
############################################################

docker ps \
--format '{{.Names}}|{{.Image}}' \
> "${REPORT_DIR}/images_in_use.txt"

############################################################
# EXECUTIVE SUMMARY
############################################################

{
echo "================================"
echo "RESUMO EXECUTIVO"
echo "================================"

echo
echo "DATA:"
date

echo
echo "CONTAINERS:"
docker ps -a --format '{{.Names}}'

echo
echo "IMAGENS:"
docker images --format '{{.Repository}}:{{.Tag}}'

echo
echo "REDES:"
docker network ls --format '{{.Name}}'

echo
echo "VOLUMES:"
docker volume ls --format '{{.Name}}'

echo
echo "PORTAS:"
docker ps --format '{{.Names}} -> {{.Ports}}'

} > "${REPORT_DIR}/EXECUTIVE_SUMMARY.txt"

echo
echo "======================================="
echo " AUDITORIA CONCLUIDA "
echo "======================================="

echo
echo "Relatorio:"
echo "${REPORT_DIR}"

echo
echo "Resumo:"
echo "${REPORT_DIR}/EXECUTIVE_SUMMARY.txt"

