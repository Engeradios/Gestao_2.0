#!/usr/bin/env bash
#
# validar_servicos_operacionais.sh
# ---------------------------------------------------------------------------
# Valida (1) os CAMPOS do dashboard de Serviços Operacionais retornados pela
# API e (2) faz SMOKE TEST das ROTAS (frontend + API), gerando log e evidência
# em JSON.
#
# Uso:
#   ./validar_servicos_operacionais.sh
#
# Variáveis de ambiente (com defaults):
#   API_BASE      Base da API NestJS            (default: http://127.0.0.1:3001)
#   WEB_BASE      Base do frontend Next.js      (default: http://127.0.0.1:3000)
#   LOGIN         E-mail/usuário para login     (obrigatório para chamar API autenticada)
#   SENHA         Senha para login
#   TOKEN         JWT já emitido (alternativa ao LOGIN/SENHA)
#   OUT_DIR       Pasta de saída                (default: ./_validacao_servicos)
#
# Exemplo:
#   LOGIN="admin@engeradios.com" SENHA="******" ./validar_servicos_operacionais.sh
#   TOKEN="eyJhbGci..." ./validar_servicos_operacionais.sh
# ---------------------------------------------------------------------------
set -Eeuo pipefail

# --------------------------- Configuração ----------------------------------
API_BASE="${API_BASE:-http://127.0.0.1:3001}"
WEB_BASE="${WEB_BASE:-http://127.0.0.1:3000}"
LOGIN="${LOGIN:-}"
SENHA="${SENHA:-}"
TOKEN="${TOKEN:-}"
OUT_DIR="${OUT_DIR:-./_validacao_servicos}"

TS="$(date +%Y%m%d_%H%M%S)"
LOG="${OUT_DIR}/validacao_${TS}.log"
EVID="${OUT_DIR}/evidencia_${TS}.json"

# Campos que o tipo Dashboard estendido DEVE conter
CAMPOS_ESPERADOS=(
  total ativos atrasados concluidos cancelados
  emDia emAndamento aguardandoCliente faltaMaterial planejamento
)

# Endpoint da API que retorna os indicadores/contadores do dashboard
API_INDICADORES="${API_INDICADORES:-/api/operacional/os/indicadores}"

# Rotas para smoke test (frontend). Ajuste conforme necessário.
ROTAS_WEB=(
  /operacional/servicos
  /operacional/servicos/configuracoes
  /operacional/dashboard
  /ordens-servico/painel
  /operacional/os
)

# Rotas de API para smoke test (autenticadas)
ROTAS_API=(
  "${API_INDICADORES}"
  /api/operacional/os/filtros
)

# ------------------------- Infra / helpers ---------------------------------
mkdir -p "$OUT_DIR"
: > "$LOG"

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[1;33m'; NC=$'\033[0m'
PASS=0; FAIL=0; WARN=0

log()  { echo -e "$*" | tee -a "$LOG"; }
ok()   { log "  ${GRN}[PASS]${NC} $*"; PASS=$((PASS+1)); }
ko()   { log "  ${RED}[FAIL]${NC} $*"; FAIL=$((FAIL+1)); }
warn() { log "  ${YLW}[WARN]${NC} $*"; WARN=$((WARN+1)); }
hr()   { log "-----------------------------------------------------------------"; }

trap 'log "${RED}Erro na linha $LINENO. Abortando.${NC}"' ERR

# HTTP GET -> imprime "CODE\n<corpo>". Aceita header Authorization opcional.
http_get() {
  local url="$1"; local auth="${2:-}"
  if [[ -n "$auth" ]]; then
    curl -sS -m 20 -o "${OUT_DIR}/.body" -w "%{http_code}" \
      -H "Authorization: Bearer ${auth}" \
      -H "Accept: application/json" "$url" || echo "000"
  else
    curl -sS -m 20 -o "${OUT_DIR}/.body" -w "%{http_code}" \
      -H "Accept: application/json" "$url" || echo "000"
  fi
}

# --------------------------- Início ----------------------------------------
log "================================================================="
log " Validação: Serviços Operacionais (campos + rotas)"
log " Data......: $(date '+%Y-%m-%d %H:%M:%S')"
log " API_BASE..: ${API_BASE}"
log " WEB_BASE..: ${WEB_BASE}"
log " Log.......: ${LOG}"
log "================================================================="

# --------------------- 1) Autenticação (JWT) -------------------------------
hr
log "1) Autenticação"
if [[ -z "$TOKEN" ]]; then
  if [[ -n "$LOGIN" && -n "$SENHA" ]]; then
    log "  Fazendo login em ${API_BASE}/api/auth/login ..."
    RESP="$(curl -sS -m 20 -X POST "${API_BASE}/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "$(python3 - "$LOGIN" "$SENHA" <<'PY'
import json,sys
print(json.dumps({"email":sys.argv[1],"senha":sys.argv[2],
                  "login":sys.argv[1],"password":sys.argv[2]}))
PY
)" || true)"
    TOKEN="$(python3 - "$RESP" <<'PY'
import json,sys
try:
    d=json.loads(sys.argv[1])
except Exception:
    print(""); raise SystemExit
for k in ("access_token","accessToken","token","jwt"):
    if isinstance(d,dict) and d.get(k):
        print(d[k]); raise SystemExit
# token aninhado em data/result
for outer in ("data","result"):
    o=d.get(outer) if isinstance(d,dict) else None
    if isinstance(o,dict):
        for k in ("access_token","accessToken","token","jwt"):
            if o.get(k): print(o[k]); raise SystemExit
print("")
PY
)"
    if [[ -n "$TOKEN" ]]; then
      ok "Login realizado; JWT obtido."
    else
      warn "Não foi possível extrair o JWT do login. As rotas de API serão testadas sem autenticação (podem retornar 401)."
    fi
  else
    warn "Sem TOKEN e sem LOGIN/SENHA. Rotas de API serão testadas sem autenticação (podem retornar 401)."
  fi
else
  ok "TOKEN informado por variável de ambiente."
fi

# --------------------- 2) Validação dos CAMPOS -----------------------------
hr
log "2) Campos do dashboard  ->  GET ${API_INDICADORES}"
CODE="$(http_get "${API_BASE}${API_INDICADORES}" "$TOKEN")"
BODY="$(cat "${OUT_DIR}/.body" 2>/dev/null || echo '')"
log "  HTTP ${CODE}"

CAMPOS_JSON="$(printf '%s\n' "${CAMPOS_ESPERADOS[@]}" | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')"

if [[ "$CODE" == "200" ]]; then
  # Analisa o corpo com python: verifica presença + tipo numérico + coerência
  python3 - "$BODY" "$CAMPOS_JSON" "$EVID" <<'PY' | tee -a "$LOG"
import json, sys

body_raw, campos_raw, evid_path = sys.argv[1], sys.argv[2], sys.argv[3]
campos = json.loads(campos_raw)

def emit(status, msg): print(f"  [{status}] {msg}")

try:
    data = json.loads(body_raw)
except Exception as e:
    emit("FAIL", f"Resposta não é JSON válido: {e}")
    json.dump({"ok": False, "erro": "json_invalido"}, open(evid_path, "w"),
              ensure_ascii=False, indent=2)
    sys.exit(3)

# Desembrulha se vier em {data:{...}} ou {result:{...}}
node = data
if isinstance(data, dict):
    for k in ("data", "result", "indicadores", "dashboard"):
        if isinstance(data.get(k), dict):
            node = data[k]; break

resultados = {}
faltando, tipo_errado, negativos = [], [], []
for c in campos:
    if not isinstance(node, dict) or c not in node:
        faltando.append(c); resultados[c] = None; continue
    v = node[c]
    resultados[c] = v
    if not isinstance(v, (int, float)) or isinstance(v, bool):
        tipo_errado.append(c)
    elif v < 0:
        negativos.append(c)

# Relatório campo a campo
for c in campos:
    v = resultados.get(c)
    if c in faltando:
        emit("FAIL", f"campo ausente: {c}")
    elif c in tipo_errado:
        emit("FAIL", f"campo não numérico: {c} = {v!r}")
    elif c in negativos:
        emit("WARN", f"valor negativo: {c} = {v}")
    else:
        emit("PASS", f"{c} = {v}")

# Coerência: soma das situações não deve exceder o total (quando presentes)
coerencia_ok = True
if isinstance(node, dict) and isinstance(node.get("total"), (int, float)):
    total = node["total"]
    situ = ["emDia","emAndamento","aguardandoCliente","faltaMaterial",
            "planejamento","atrasados","concluidos","cancelados"]
    soma = sum(node[s] for s in situ
               if isinstance(node.get(s), (int, float)) and not isinstance(node.get(s), bool))
    emit("INFO", f"total={total} | soma_situacoes={soma}")
    if soma > total:
        emit("WARN", f"soma das situações ({soma}) excede o total ({total}) "
                     "-> verificar sobreposição de status")
        coerencia_ok = False
    else:
        emit("PASS", "coerência total >= soma das situações")

evid = {
    "ok": len(faltando) == 0 and len(tipo_errado) == 0,
    "campos_esperados": campos,
    "campos_faltando": faltando,
    "campos_tipo_errado": tipo_errado,
    "campos_negativos": negativos,
    "coerencia_total_ok": coerencia_ok,
    "valores": resultados,
}
json.dump(evid, open(evid_path, "w"), ensure_ascii=False, indent=2)

sys.exit(0 if evid["ok"] else 4)
PY
  RC=${PIPESTATUS[0]}
  if [[ $RC -eq 0 ]]; then
    ok "Todos os campos esperados presentes e numéricos. Evidência: ${EVID}"
  else
    ko "Divergência nos campos (ver acima). Evidência: ${EVID}"
  fi
else
  ko "Falha ao obter indicadores (HTTP ${CODE}). Corpo: $(echo "$BODY" | head -c 300)"
  echo "$BODY" > "${OUT_DIR}/erro_indicadores_${TS}.txt"
fi

# --------------------- 3) Smoke test ROTAS API -----------------------------
hr
log "3) Smoke test - rotas de API"
for r in "${ROTAS_API[@]}"; do
  CODE="$(http_get "${API_BASE}${r}" "$TOKEN")"
  case "$CODE" in
    200|204)          ok  "API ${r} -> HTTP ${CODE}" ;;
    401|403)          warn "API ${r} -> HTTP ${CODE} (autenticação/permissão)" ;;
    000)              ko  "API ${r} -> sem resposta (serviço fora do ar?)" ;;
    *)                ko  "API ${r} -> HTTP ${CODE}" ;;
  esac
done

# --------------------- 4) Smoke test ROTAS WEB -----------------------------
hr
log "4) Smoke test - rotas do frontend"
for r in "${ROTAS_WEB[@]}"; do
  # segue redirecionamentos (-L) porque rotas protegidas redirecionam p/ /login
  CODE="$(curl -sSL -m 20 -o /dev/null -w "%{http_code}" "${WEB_BASE}${r}" || echo "000")"
  case "$CODE" in
    200|204|304)      ok  "WEB ${r} -> HTTP ${CODE}" ;;
    301|302|307|308)  warn "WEB ${r} -> HTTP ${CODE} (redirect - provável /login)" ;;
    000)              ko  "WEB ${r} -> sem resposta (frontend fora do ar?)" ;;
    *)                ko  "WEB ${r} -> HTTP ${CODE}" ;;
  esac
done

# --------------------------- Resumo ----------------------------------------
hr
log "RESUMO"
log "  PASS: ${PASS}   WARN: ${WARN}   FAIL: ${FAIL}"
log "  Log.......: ${LOG}"
log "  Evidência.: ${EVID}"
rm -f "${OUT_DIR}/.body"

if [[ $FAIL -gt 0 ]]; then
  log "${RED}Validação concluída COM FALHAS.${NC}"
  exit 1
else
  log "${GRN}Validação concluída com sucesso.${NC}"
  exit 0
fi
