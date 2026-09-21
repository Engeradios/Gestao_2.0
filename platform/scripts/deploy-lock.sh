#!/bin/bash

LOCK=/tmp/engeradios_platform_deploy.lock

if [ -f "$LOCK" ]; then
    echo "DEPLOY EM EXECUCAO"
    exit 1
fi

touch "$LOCK"

echo "$LOCK"
