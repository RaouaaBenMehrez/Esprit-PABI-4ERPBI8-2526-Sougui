# ─── Frontend Vite/React — Dockerfile ────────────────────────────────────────
# Build multi-stage : Node pour builder, Nginx pour servir

# ── Stage 1 : Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

LABEL description="Frontend Vite React — Sougui BI Suite"

WORKDIR /app

# Copier les fichiers de dépendances d'abord (cache layer)
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci --silent

# Copier le reste du code source
COPY . .

# Variables d'environnement pour le build
# L'API backend est accessible via le service Docker "backend" sur le port 5000
ENV VITE_API_URL=http://localhost:5000
ENV VITE_AGENT_URL=http://localhost:8000

# Builder l'application React
RUN npm run build

# ── Stage 2 : Serve avec Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copier les fichiers buildés vers nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration Nginx pour le routing React (SPA)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:5000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
