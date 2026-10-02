#!/usr/bin/env bash
set -euo pipefail

# vs-api 를 로컬 프로세스로 기동한다(포트 8090, 프로필 local). Flyway 가 기동 때 스키마·공통코드를 만든다.
#   bash scripts/local-dev-api.sh           # 빌드 후 기동 (make dev-api)
#   bash scripts/local-dev-api.sh --check   # env 만 확인
# deploy/local/.env.secret 의 VS_* 줄만 읽어 이 프로세스에만 넣는다(source 하지 않는다 — 임의 셸 코드 실행 방지).
# bootRun 대신 bootJar + java -jar 를 쓴다 — 프로세스 하나라 끄기 쉽다.
# 이 PC 처럼 사용자 TEMP 경로에 한글이 있으면 Gradle 이 깨진다: 실행 전 TEMP·TMP 를 ASCII 경로로 바꾼다.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="deploy/local/.env.secret"
if [ ! -f "$ENV_FILE" ]; then
  echo "[local-dev-api] ERROR: ${ENV_FILE} 없음 — 먼저 'make dev-up' 을 실행하십시오." >&2
  exit 1
fi

REQUIRED="VS_DB_URL VS_DB_USER VS_DB_PASSWORD VS_JWT_SIGNING_KEY VS_REDIS_HOST VS_REDIS_PORT"
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  case "$line" in
    VS_*=*) export "$line" ;;
  esac
done < "$ENV_FILE"

for key in $REQUIRED; do
  if [ -z "${!key:-}" ] || [ "${!key}" = "__GENERATE__" ]; then
    echo "[local-dev-api] ERROR: ${ENV_FILE} 에 ${key} 값이 없습니다." >&2
    exit 1
  fi
done

if [ "${1:-}" = "--check" ]; then
  echo "[local-dev-api] OK — env 확인됨 (비밀값은 출력하지 않음)"
  exit 0
fi

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"
export VS_API_PORT="${VS_API_PORT:-8090}"

cd backend
./gradlew :vs-api:bootJar -q --console=plain
echo "[local-dev-api] vs-api 기동 (http://localhost:${VS_API_PORT}, profile=${SPRING_PROFILES_ACTIVE})"
exec java -jar vs-api/build/libs/vs-api.jar
