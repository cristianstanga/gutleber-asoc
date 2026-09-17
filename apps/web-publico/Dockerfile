# Build context: raíz del monorepo
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/web-publico/package*.json ./apps/web-publico/
RUN npm install -w @gutleber/web-publico

COPY apps/web-publico ./apps/web-publico

RUN cd apps/web-publico && npm run build

# ── Nginx sirve los archivos estáticos ─────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/apps/web-publico/dist /usr/share/nginx/html
COPY apps/web-publico/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
