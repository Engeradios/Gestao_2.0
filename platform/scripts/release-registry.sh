#!/bin/bash

set -Eeuo pipefail

echo

find /opt/engeradios2/platform/releases \
-maxdepth 1 \
-type d \
| sort
