#!/bin/bash

PROJECT="/Users/mac/Documents/gutleber & asoc"

echo "🐘 Levantando base de datos..."
cd "$PROJECT"
docker compose up -d postgres

# Esperar que postgres esté listo
echo "⏳ Esperando que PostgreSQL esté listo..."
sleep 3

echo "🔄 Matando procesos anteriores del servidor..."
pkill -f "ts-node-dev.*gutleber" 2>/dev/null
sleep 1

echo "🚀 Iniciando API y Frontend..."
osascript <<EOF
tell application "Terminal"
    -- Terminal API
    do script "cd '$PROJECT/apps/api' && npm run dev"
    -- Terminal Frontend
    do script "cd '$PROJECT/apps/web' && npm run dev && echo '✅ Frontend listo en http://localhost:5173'"
end tell
EOF

echo ""
echo "✅ Todo iniciado:"
echo "   API      → http://localhost:3001"
echo "   Frontend → http://localhost:5173"
echo ""
echo "Abriendo el sistema en el browser..."
sleep 4
open "http://localhost:5173"
