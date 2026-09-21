#!/bin/bash

set -Eeuo pipefail

DATE=$(date +%Y%m%d_%H%M%S)

docker exec engeradios2-postgres \
psql -U engeradios_app \
-d engeradios2_novo \
-c "
COPY (
  SELECT *
  FROM configuracao_email
)
TO STDOUT WITH CSV HEADER;
" \
> /opt/engeradios2/platform/reports/smtp_backup_${DATE}.csv

echo
echo "BACKUP GERADO:"
echo "/opt/engeradios2/platform/reports/smtp_backup_${DATE}.csv"

