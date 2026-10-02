#!/usr/bin/env bash
set -euo pipefail

# 로컬 개발용 PostgreSQL 16 · Redis 7 컨테이너를 docker run 으로 띄운다(H-PMS local-dev-db-up.sh 와 같은 방식).
#   bash scripts/local-dev-up.sh           # 기동 (make dev-up)
#   bash scripts/local-dev-up.sh --down    # 중지 (make dev-down) — 데이터는 남는다
#   bash scripts/local-dev-up.sh --reset   # 컨테이너·볼륨 삭제 (make dev-reset) — DB 를 처음부터
# H-PMS(5432·9000) 와 겹치지 않게 5442 · 6389 를 쓴다. vs-local-dev-* 외의 컨테이너는 건드리지 않는다.
# deploy/local/.env.secret 이 없으면 .env.secret.example 에서 만들고 DB 비밀번호·JWT 서명키를 무작위로 채운다.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
export MSYS_NO_PATHCONV=1   # Git Bash 가 -v name:/path 의 경로를 Windows 경로로 바꾸지 않게

DOCKER="$(command -v docker || true)"
if [ -z "$DOCKER" ] && [ -x "/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]; then
  DOCKER="/c/Program Files/Docker/Docker/resources/bin/docker.exe"
fi
if [ -z "$DOCKER" ]; then
  echo "[local-dev-up] ERROR: docker CLI 를 찾을 수 없습니다. Docker Desktop 을 실행하십시오." >&2
  exit 1
fi
docker() { "$DOCKER" "$@"; }

NETWORK="vs-local-dev-net"
PG="vs-local-dev-postgres"
REDIS="vs-local-dev-redis"
PG_VOLUME="vs-local-dev-pgdata"
PG_IMAGE="postgres:16.14"
REDIS_IMAGE="redis:7"
PG_PORT="5442"
REDIS_PORT="6389"
DB_NAME="vs"
DB_USER="vs"
ENV_FILE="deploy/local/.env.secret"
ENV_EXAMPLE="deploy/local/.env.secret.example"
CRED_LABEL="vs.local-dev.cred-hash"
READY_TIMEOUT=60

case "${1:-}" in
  --down)
    docker stop "$PG" "$REDIS" >/dev/null 2>&1 || true
    echo "[local-dev-up] 중지 완료 ($PG, $REDIS)"
    exit 0
    ;;
  --reset)
    docker rm -f "$PG" "$REDIS" >/dev/null 2>&1 || true
    docker volume rm "$PG_VOLUME" >/dev/null 2>&1 || true
    echo "[local-dev-up] 컨테이너·볼륨 삭제 완료 — 다시 'make dev-up'"
    exit 0
    ;;
  "") ;;
  *)
    echo "사용법: $0 [--down|--reset]" >&2
    exit 1
    ;;
esac

rand_hex() { openssl rand -hex "$1"; }

if [ ! -f "$ENV_FILE" ]; then
  echo "[local-dev-up] ${ENV_FILE} 없음 — ${ENV_EXAMPLE} 에서 만들고 비밀번호·서명키를 무작위로 채웁니다"
  awk -v pw="$(rand_hex 24)" -v key="$(rand_hex 32)" '
    /^VS_DB_PASSWORD=__GENERATE__$/     { print "VS_DB_PASSWORD=" pw; next }
    /^VS_JWT_SIGNING_KEY=__GENERATE__$/ { print "VS_JWT_SIGNING_KEY=" key; next }
    { print }' "$ENV_EXAMPLE" > "$ENV_FILE"
fi

# env 파일을 source 하지 않고 필요한 키만 읽는다(임의 셸 코드 실행 방지).
read_env() {
  local line
  line="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 || true)"
  if [ -z "$line" ]; then
    echo "[local-dev-up] ERROR: ${ENV_FILE} 에 '$1' 이 없습니다." >&2
    exit 1
  fi
  printf '%s' "${line#*=}"
}

DB_PASSWORD="$(read_env VS_DB_PASSWORD)"
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "__GENERATE__" ]; then
  echo "[local-dev-up] ERROR: ${ENV_FILE} 의 VS_DB_PASSWORD 를 채우십시오." >&2
  exit 1
fi
PG_CRED_HASH="$(printf '%s' "$DB_PASSWORD" | sha256sum | cut -d' ' -f1)"

exists()  { docker inspect "$1" >/dev/null 2>&1; }
running() { [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = "true" ]; }

docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK" >/dev/null

# --- PostgreSQL ---
if exists "$PG"; then
  if [ "$(docker inspect -f "{{ index .Config.Labels \"${CRED_LABEL}\" }}" "$PG")" != "$PG_CRED_HASH" ]; then
    echo "[local-dev-up] ERROR: 기존 ${PG} 의 비밀번호가 ${ENV_FILE} 와 다릅니다 — 'make dev-reset' 후 다시 실행하십시오." >&2
    exit 1
  fi
  running "$PG" || docker start "$PG" >/dev/null
  echo "[local-dev-up] PostgreSQL 재사용 ($PG)"
else
  docker run -d --name "$PG" --network "$NETWORK" -p "${PG_PORT}:5432" \
    -v "${PG_VOLUME}:/var/lib/postgresql/data" --label "${CRED_LABEL}=${PG_CRED_HASH}" \
    -e POSTGRES_DB="$DB_NAME" -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    "$PG_IMAGE" >/dev/null
  echo "[local-dev-up] PostgreSQL 생성 ($PG, ${PG_PORT})"
fi

# --- Redis --- (세션은 휘발이 맞다 — 볼륨을 두지 않는다)
if exists "$REDIS"; then
  running "$REDIS" || docker start "$REDIS" >/dev/null
  echo "[local-dev-up] Redis 재사용 ($REDIS)"
else
  docker run -d --name "$REDIS" --network "$NETWORK" -p "${REDIS_PORT}:6379" "$REDIS_IMAGE" >/dev/null
  echo "[local-dev-up] Redis 생성 ($REDIS, ${REDIS_PORT})"
fi

wait_ready() {
  local name="$1"; shift
  for _ in $(seq 1 "$READY_TIMEOUT"); do
    if docker exec "$name" "$@" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "[local-dev-up] ERROR: ${name} 가 ${READY_TIMEOUT}초 안에 준비되지 않았습니다. 'docker logs ${name}' 확인." >&2
  exit 1
}
wait_ready "$PG" pg_isready -U "$DB_USER" -d "$DB_NAME"
wait_ready "$REDIS" redis-cli ping

echo "[local-dev-up] 완료 — 다음: make dev-api (Flyway 가 스키마를 만든다) → make dev-seed-accounts"
