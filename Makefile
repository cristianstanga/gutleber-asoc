.PHONY: up down logs db-up db-down dev migrate seed studio reset

# Docker
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

db-up:
	docker compose up -d postgres

db-down:
	docker compose stop postgres

# Dev
install:
	npm install

dev:
	npm run dev

# Prisma
migrate:
	cd apps/api && npx prisma migrate dev --name init

seed:
	cd apps/api && npx ts-node --transpile-only prisma/seed.ts

studio:
	cd apps/api && npx prisma studio

reset:
	cd apps/api && npx prisma migrate reset --force && npx ts-node --transpile-only prisma/seed.ts

# Estado del proyecto
status:
	@echo ""
	@echo "── LOCAL (último commit) ──────────────────────────"
	@git log --oneline -1
	@echo ""
	@echo "── GITHUB / VPS (origin/main) ─────────────────────"
	@git fetch origin -q && git log origin/main --oneline -1
	@echo ""
	@echo "── DIFERENCIA local vs GitHub ─────────────────────"
	@git log origin/main..HEAD --oneline | { grep . && echo "" || echo "  (ninguno — todo pusheado)"; }
	@echo "── SIN COMMITEAR ──────────────────────────────────"
	@git status --short | grep -v "^?? .claude" | grep -v "^?? brand" | { grep . || echo "  (nada — todo limpio)"; }
	@echo ""

# Build
build:
	npm run build

# Prod
prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down
