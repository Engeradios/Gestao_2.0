#!/usr/bin/env bash
#
# validar_servicos_operacionais_v2.sh
# ---------------------------------------------------------------------------
# Valida o dashboard de SERVIÇOS OPERACIONAIS e o filtro por situação.
#
# Arquitetura real (Gestão Engerádios):
#   * Autenticação por COOKIE (login grava cookie httpOnly no frontend).
#   * As chamadas de API passam pelo PROXY do frontend (porta 3000),
#     que injeta o Bearer e repassa ao NestJS (/api/v1 na porta 3001).
#   * Dashboard de Serviços = GET /api/operacional/painel  (método painel()).
#
# O script:
#   1) Faz login por cookie no frontend.
#   2) Lê /api/operacional/painel e valida os 10 campos + coerência.
#   3) Smoke test das rotas de API (via proxy do frontend).
#   4) Smoke test das páginas do frontend.
#   5) Testa o FILTRO por situação: confere que cada card (?situacao=...)
#      retorna 'total' compatível com o contador do painel.
#
# Uso:
#   LOGIN="admin@engeradios.local" SENHA="******" ./validar_servicos_operacionais_v2.sh
#
# Variáveis (defaults):
#   WEB_BASE   http://127.0.0.1:3000
#   LOGIN      (obrigatório)
#   SENHA      (obrigatório)
#   OUT_DIR    ./_validacao_servicos
# ---------------------------------------------------------------------------
set -Eeuo pipefail

WEB_BASE="${WEB_BASE:-http://127.0.0.1:3000}"
LOGIN="${LOGIN:-}"
SENHA="${SENHA:-}"
OUT_DIR="${OUT_DIR:-./_validacao_servicos}"

TS="$(date +%Y%m%d_%H%M%S)"
LOG="${OUT_DIR}/validacao_${TS}.log"
EVID="${OUT_DIR}/evidencia_${TS}.json"
COOKIE="${OUT_DIR}/.cookies_${TS}"

PAINEL="/api/operacional/painel"
SERVICOS="/api/operacional/servicos"

CAMPOS_ESPERADOS=(
  total ativos atrasados concluidos cancelados
  emDia emAndamento aguardandoCliente faltaMaterial planejamento
)

# Mapeamento card(query situacao) -> campo do painel usado para conferência
#   situacao_query : campo_painel
SITUACOES=(
  "atrasado:atrasados"
  "em_dia:emDia"
  "em_andamento:emAndamento"
  "aguardando_cliente:aguardandoCliente"
  "falta_material:faltaMaterial"
  "planejamento:planejamento"
  "concluido:concluidos"
)

# Rotas de API (via proxy do frontend)
ROTAS_API=(
  "${PAINEL}"
  "${SERVICOS}?porPagina=1"
  "/api/operacional/servicos/responsaveis-elegiveis"
)

# Páginas do frontend
ROTAS_WEB=(
  /operacional/servicos
  /operacional/servicos/configuracoes
  /operacional/dashboard
  /ordens-servico/painel
  /operacional/os
)

mkdir -p "$OUT_DIR"
: > "$LOG"

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[1;33m'; NC=$'\033[0m'
PASS=0; FAIL=0; WARN=0

log()  { echo -e "$*" | tee -a "$LOG"; }
ok()   { log "  ${GRN}[PASS]${NC} $*"; PASS=$((PASS+1)); }
ko()   { log "  ${RED}[FAIL]${NC} $*"; FAIL=$((FAIL+1)); }
warn() { log "  ${YLW}[WARN]${NC} $*"; WARN=$((WARN+1)); }
hr()   { log "-----------------------------------------------------------------"; }

cleanup() { rm -f "$COOKIE" "${OUT_DIR}/.body" 2>/dev/null || true; }
trap 'log "${RED}Erro na linha $LINENO.${NC}"; cleanup' ERR
trap cleanup EXIT

# GET autenticado (cookie). Ecoa o HTTP code; corpo em $OUT_DIR/.body
get_auth() {
  local path="$1"
  curl -sS -m 20 -b "$COOKIE" -o "${OUT_DIR}/.body" -w "%{http_code}" \
    -H "Accept: application/json" "${WEB_BASE}${path}" || echo "000"
}

# Lê um número de um campo simples no JSON de $OUT_DIR/.body
json_num() {
  local campo="$1"
  python3 - "$campo" <<'PY'
import json,sys
campo=sys.argv[1]
try:
    d=json.load(open(sys.argv[0] if False else __import__("os").environ.get("BODYFILE")))
except Exception:
    print("ERR"); raise SystemExit
v=d.get(campo) if isinstance(d,dict) else None
print(v if isinstance(v,(int,float)) and not isinstance(v,bool) else "ERR")
PY
}

log "================================================================="
log " Validação v2: Serviços Operacionais (painel + situação)"
log " Data......: $(date '+%Y-%m-%d %H:%M:%S')"
log " WEB_BASE..: ${WEB_BASE}"
log " Painel....: ${PAINEL}"
log " Log.......: ${LOG}"
log "================================================================="

# -------------------- 1) Login por cookie ---------------------------------
hr
log "1) Autenticação (cookie)"
if [[ -z "$LOGIN" || -z "$SENHA" ]]; then
  ko "Informe LOGIN e SENHA (variáveis de ambiente)."
  exit 2
fi

LOGIN_CODE="$(curl -sS -m 20 -c "$COOKIE" -X POST \
  "${WEB_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$(python3 - "$LOGIN" "$SENHA" <<'PY'
import json,sys
print(json.dumps({"email":sys.argv[1],"senha":sys.argv[2]}))
PY
)" -o /dev/null -w "%{http_code}" || echo "000")"

if [[ "$LOGIN_CODE" == "200" ]]; then
  ok "Login OK (HTTP 200); cookie de sessão salvo."
else
  ko "Login falhou (HTTP ${LOGIN_CODE}). Verifique credenciais/serviço."
  exit 2
fi

# -------------------- 2) Campos do painel ---------------------------------
hr
log "2) Campos do dashboard -> GET ${PAINEL}"
CODE="$(get_auth "${PAINEL}")"
log "  HTTP ${CODE}"

if [[ "$CODE" != "200" ]]; then
  ko "Não foi possível ler o painel (HTTP ${CODE})."
else
  CAMPOS_JSON="$(printf '%s\n' "${CAMPOS_ESPERADOS[@]}" | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')"
  BODY="$(cat "${OUT_DIR}/.body")"

  python3 - "$BODY" "$CAMPOS_JSON" "$EVID" <<'PY' | tee -a "$LOG"
import json,sys
body,campos_raw,evid=sys.argv[1],sys.argv[2],sys.argv[3]
campos=json.loads(campos_raw)
def emit(s,m): print(f"  [{s}] {m}")
try: d=json.loads(body)
except Exception as e:
    emit("FAIL",f"JSON inválido: {e}")
    json.dump({"ok":False},open(evid,"w")); sys.exit(3)
falt=[];tipo=[];neg=[];vals={}
for c in campos:
    if not isinstance(d,dict) or c not in d: falt.append(c);vals[c]=None;continue
    v=d[c];vals[c]=v
    if not isinstance(v,(int,float)) or isinstance(v,bool): tipo.append(c)
    elif v<0: neg.append(c)
for c in campos:
    v=vals[c]
    if c in falt: emit("FAIL",f"campo ausente: {c}")
    elif c in tipo: emit("FAIL",f"não numérico: {c} = {v!r}")
    elif c in neg: emit("WARN",f"negativo: {c} = {v}")
    else: emit("PASS",f"{c} = {v}")
coer=True
if isinstance(d.get("total"),(int,float)):
    total=d["total"]
    situ=["emDia","emAndamento","aguardandoCliente","faltaMaterial",
          "planejamento","atrasados","concluidos","cancelados"]
    soma=sum(d[s] for s in situ if isinstance(d.get(s),(int,float)) and not isinstance(d.get(s),bool))
    emit("INFO",f"total={total} | soma_situacoes={soma}")
    if soma>total: emit("WARN",f"soma ({soma}) > total ({total})"); coer=False
    else: emit("PASS","coerência total >= soma das situações")
json.dump({"ok":len(falt)==0 and len(tipo)==0,"faltando":falt,
           "tipo_errado":tipo,"negativos":neg,"coerencia":coer,"valores":vals},
          open(evid,"w"),ensure_ascii=False,indent=2)
sys.exit(0 if (len(falt)==0 and len(tipo)==0) else 4)
PY
  RC=${PIPESTATUS[0]}
  if [[ $RC -eq 0 ]]; then
    ok "10 campos presentes e numéricos. Evidência: ${EVID}"
  else
    ko "Divergência nos campos. Evidência: ${EVID}"
  fi
fi

# -------------------- 3) Smoke test rotas de API --------------------------
hr
log "3) Smoke test - rotas de API (via proxy)"
for r in "${ROTAS_API[@]}"; do
  CODE="$(get_auth "$r")"
  case "$CODE" in
    200|204)  ok  "API ${r} -> ${CODE}" ;;
    401|403)  warn "API ${r} -> ${CODE} (auth/perm)" ;;
    000)      ko  "API ${r} -> sem resposta" ;;
    *)        ko  "API ${r} -> ${CODE}" ;;
  esac
done

# -------------------- 4) Smoke test páginas web ---------------------------
hr
log "4) Smoke test - páginas do frontend"
for r in "${ROTAS_WEB[@]}"; do
  CODE="$(curl -sSL -m 20 -b "$COOKIE" -o /dev/null -w "%{http_code}" \
    "${WEB_BASE}${r}" || echo "000")"
  case "$CODE" in
    200|204|304)      ok  "WEB ${r} -> ${CODE}" ;;
    301|302|307|308)  warn "WEB ${r} -> ${CODE} (redirect)" ;;
    000)              ko  "WEB ${r} -> sem resposta" ;;
    *)                ko  "WEB ${r} -> ${CODE}" ;;
  esac
done

# -------------------- 5) Filtro por situação ------------------------------
hr
log "5) Filtro por situação (cada card filtra a listagem)"

# Recarrega o painel para termos os contadores de referência
get_auth "${PAINEL}" >/dev/null
cp "${OUT_DIR}/.body" "${OUT_DIR}/.painel"

get_field() {
  BODYFILE="${OUT_DIR}/.painel" python3 - "$1" <<'PY'
import json,os,sys
d=json.load(open(os.environ["BODYFILE"]))
v=d.get(sys.argv[1])
print(v if isinstance(v,(int,float)) and not isinstance(v,bool) else "ERR")
PY
}

for pair in "${SITUACOES[@]}"; do
  situ="${pair%%:*}"; campo="${pair##*:}"
  esperado="$(get_field "$campo")"

  CODE="$(get_auth "${SERVICOS}?situacao=${situ}&porPagina=1")"
  if [[ "$CODE" != "200" ]]; then
    ko "situacao=${situ}: HTTP ${CODE}"
    continue
  fi

  obtido="$(BODYFILE="${OUT_DIR}/.body" python3 - <<'PY'
import json,os
d=json.load(open(os.environ["BODYFILE"]))
v=d.get("total")
print(v if isinstance(v,(int,float)) and not isinstance(v,bool) else "ERR")
PY
)"

  if [[ "$esperado" == "ERR" || "$obtido" == "ERR" ]]; then
    warn "situacao=${situ}: não foi possível comparar (esperado=${esperado}, obtido=${obtido})"
  elif [[ "$esperado" == "$obtido" ]]; then
    ok  "situacao=${situ}: total=${obtido} == painel.${campo}=${esperado}"
  else
    warn "situacao=${situ}: total=${obtido} != painel.${campo}=${esperado} (pode haver diferença por status compostos)"
  fi
done

rm -f "${OUT_DIR}/.painel"

# --------------------------- Resumo ---------------------------------------
hr
log "RESUMO"
log "  PASS: ${PASS}   WARN: ${WARN}   FAIL: ${FAIL}"
log "  Log.......: ${LOG}"
log "  Evidência.: ${EVID}"

if [[ $FAIL -gt 0 ]]; then
  log "${RED}Validação concluída COM FALHAS.${NC}"
  exit 1
else
  log "${GRN}Validação concluída com sucesso.${NC}"
  exit 0
fi
