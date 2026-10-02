.PHONY: dev-up dev-down dev-reset dev-api dev-seed-accounts test

# 로컬 개발 환경 — docs/dev/login.md 12절. 순서: dev-up → dev-api → dev-seed-accounts → npm run dev

dev-up:
	bash scripts/local-dev-up.sh

dev-down:
	bash scripts/local-dev-up.sh --down

dev-reset:
	bash scripts/local-dev-up.sh --reset

dev-api:
	bash scripts/local-dev-api.sh

dev-seed-accounts:
	bash scripts/local-dev-seed-accounts.sh

test:
	cd backend && ./gradlew test
	npm run build
	npm run check:sb
