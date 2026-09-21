#!/bin/bash

set -Eeuo pipefail

OUT="/opt/engeradios2/platform/reports/platform_manifest_$(date +%Y%m%d_%H%M%S).json"

API="engeradios2-api-original"

docker inspect "$API" > "${OUT}.tmp"

jq '.[0] | {

generated_at: now,

platform: {
name: "Engeradios Platform",
version: "1.0"
},

api: {
container: .Name,
image: .Config.Image,
hostname: .Config.Hostname,
entrypoint: .Config.Entrypoint,
cmd: .Config.Cmd,
restart_policy: .HostConfig.RestartPolicy,
port_bindings: .HostConfig.PortBindings,
networks: .NetworkSettings.Networks,
mounts: .Mounts
}

}' "${OUT}.tmp" > "$OUT"

rm -f "${OUT}.tmp"

echo
echo "==================================="
echo "MANIFESTO GERADO"
echo "==================================="
echo "$OUT"

