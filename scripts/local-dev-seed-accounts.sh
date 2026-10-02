#!/usr/bin/env bash
set -euo pipefail

# 로컬 테스트 계정(db/05_local_account_seed.sql)을 넣는다 — 로컬 전용, Flyway 밖이다(make dev-seed-accounts).
# 스키마는 API 기동 때 Flyway 가 만든다 → 'make dev-api' 를 한 번 띄운 뒤 실행한다.
# 시드는 on conflict do nothing 이라 다시 실행해도 이미 있는 계정을 되돌리지 않는다(잠금 해제 등은 직접 UPDATE).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DOCKER="$(command -v docker || true)"
if [ -z "$DOCKER" ] && [ -x "/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]; then
  DOCKER="/c/Program Files/Docker/Docker/resources/bin/docker.exe"
fi
if [ -z "$DOCKER" ]; then
  echo "[local-dev-seed] ERROR: docker CLI 를 찾을 수 없습니다." >&2
  exit 1
fi

PG="vs-local-dev-postgres"
SEED="db/05_local_account_seed.sql"

if [ "$("$DOCKER" exec "$PG" psql -U vs -d vs -tAc "select to_regclass('public.vs_mngr_b') is not null")" != "t" ]; then
  echo "[local-dev-seed] ERROR: vs_mngr_b 가 없습니다 — 'make dev-api' 로 Flyway 를 먼저 돌리십시오." >&2
  exit 1
fi

"$DOCKER" exec -i "$PG" psql -v ON_ERROR_STOP=1 -q -U vs -d vs < "$SEED"
echo "[local-dev-seed] 완료 — 계정 $("$DOCKER" exec "$PG" psql -U vs -d vs -tAc "select count(*) from vs_mngr_b")건"
