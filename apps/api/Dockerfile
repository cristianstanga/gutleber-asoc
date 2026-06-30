# Build context: raíz del monorepo
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# Instalar dependencias (workspace)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install -w @gutleber/api

# Código fuente + prisma
COPY apps/api ./apps/api

# Generar Prisma client y compilar TypeScript
RUN cd apps/api && npx prisma generate
RUN cd apps/api && npm run build

# ── Imagen final (más liviana) ──────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl postgresql-client

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install -w @gutleber/api --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

# Migraciones automáticas al iniciar + servidor
CMD ["sh", "-c", "cd /app/apps/api && npx prisma migrate deploy && node dist/index.js"]
