#!/usr/bin/env bash

set -Eeuo pipefail

DATA=$(date +%Y%m%d_%H%M%S)

PROJETO=$(basename "$(pwd)")
DESTINO="/tmp/${PROJETO}_auditoria_${DATA}"
ARQUIVO="${PROJETO}_auditoria_${DATA}.tar.gz"

echo ""
echo "=================================================="
echo "EXPORTADOR DE AUDITORIA ENGERADIOS 2.0"
echo "=================================================="
echo ""

mkdir -p "$DESTINO"

echo "[1/8] Copiando estrutura necessária..."

rsync -a \
./ \
"$DESTINO/" \
--exclude=node_modules \
--exclude=.git \
--exclude=.github \
--exclude=.next \
--exclude=.next* \
--exclude=.turbo \
--exclude=dist \
--exclude=build \
--exclude=coverage \
--exclude=out \
--exclude=tmp \
--exclude=temp \
--exclude=logs \
--exclude=log \
--exclude=storage \
--exclude=uploads \
--exclude=backups \
--exclude=.vscode \
--exclude=.idea \
--exclude=.cache \
--exclude=.npm \
--exclude=.pnpm-store \
--exclude='*.log' \
--exclude='*.zip' \
--exclude='*.tar.gz'

echo "[2/8] Removendo código gerado..."

find "$DESTINO" -type d -name generated -exec rm -rf {} + 2>/dev/null || true

echo "[3/8] Removendo builds do Next..."

find "$DESTINO" -type d -name ".next*" -exec rm -rf {} + 2>/dev/null || true

echo "[4/8] Removendo segredos..."

find "$DESTINO" \
-type f \
\( \
-name ".env" \
-o -name ".env.*" \
-o -name "*.pem" \
-o -name "*.key" \
-o -name "*.crt" \
-o -name "*.pfx" \
-o -name "*.p12" \
\) \
-delete

echo "[5/8] Gerando inventário..."

find "$DESTINO" > "$DESTINO/ESTRUTURA_COMPLETA.txt"

echo "[6/8] Gerando relatório..."

cat << EOF > "$DESTINO/RELATORIO_AUDITORIA.txt"

PROJETO: $PROJETO

GERADO EM:
$(date)

ESTRUTURA EXPORTADA

Backend:
- apps/api/src
- prisma
- migrations

Frontend:
- apps/web/src

Infraestrutura:
- docker-compose.yml
- Dockerfiles
- package.json
- pnpm-workspace.yaml
- turbo.json

EXCLUÍDO

- node_modules
- .git
- .next
- generated
- dist
- build
- coverage
- backups
- uploads
- storage
- secrets
- certificados

EOF

echo "[7/8] Estatísticas..."

{
echo ""
echo "ARQUIVOS:"
find "$DESTINO" -type f | wc -l

echo ""
echo "DIRETÓRIOS:"
find "$DESTINO" -type d | wc -l

echo ""
echo "TAMANHO:"
du -sh "$DESTINO"
} >> "$DESTINO/RELATORIO_AUDITORIA.txt"

echo "[8/8] Compactando..."

tar -czf "$ARQUIVO" -C /tmp "$(basename "$DESTINO")"

echo ""
echo "=================================================="
echo "AUDITORIA GERADA COM SUCESSO"
echo "=================================================="
echo ""
echo "Arquivo:"
echo "$ARQUIVO"
echo ""
du -sh "$ARQUIVO"
echo ""
