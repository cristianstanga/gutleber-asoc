#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# deploy.sh — Ejecutar en el VPS para instalar/actualizar Gutleber
# Uso:  bash deploy.sh
# ─────────────────────────────────────────────────────────────────
set -e

REPO="https://github.com/cristianstanga/gutleber-asoc.git"
DIR="/root/gutleber-asoc"

echo ""
echo "🏢 GUTLEBER & ASOC — Deploy"
echo "─────────────────────────────"

# ── 1. Clonar o actualizar ──────────────────────────────────────
if [ -d "$DIR" ]; then
  echo "📥 Actualizando código..."
  cd "$DIR" && git pull origin main
else
  echo "📥 Clonando repositorio..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

# ── 2. Verificar .env.production ───────────────────────────────
if [ ! -f ".env.production" ]; then
  echo ""
  echo "⚠️  No existe .env.production"
  echo "   Crealo con: cp .env.production.example .env.production"
  echo "   Luego editá los valores y volvé a ejecutar deploy.sh"
  exit 1
fi

# ── 3. Buildear imágenes ───────────────────────────────────────
echo "🔨 Buildeando imágenes Docker..."
docker compose -f docker-compose.production.yml --env-file .env.production build

# ── 4. Levantar servicios ──────────────────────────────────────
echo "🚀 Iniciando servicios..."
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# ── 5. Esperar que postgres esté listo ─────────────────────────
echo "⏳ Esperando base de datos..."
sleep 5

# ── 6. Correr migraciones (ya está en el CMD del Dockerfile) ───
echo "✅ Migraciones corren automáticamente al iniciar la API"

# ── 7. Estado ─────────────────────────────────────────────────
echo ""
echo "─────────────────────────────"
echo "✅ Deploy completado"
docker compose -f docker-compose.production.yml ps
echo ""
echo "📋 Logs API:  docker compose -f docker-compose.production.yml logs -f gutleber-api"
echo "📋 Logs Web:  docker compose -f docker-compose.production.yml logs -f gutleber-web"
