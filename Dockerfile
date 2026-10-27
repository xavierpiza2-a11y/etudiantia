# ── Étape 1 : compilation de l'interface (Vite) ──────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY shared ./shared
RUN npm run build

# ── Étape 2 : image finale (serveur Node + interface compilée) ───────────────
FROM node:22-alpine
ENV NODE_ENV=production \
    DATA_DIR=/data \
    TZ=Europe/Paris
RUN apk add --no-cache su-exec tzdata
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data && chown node:node /data

# Tout ce qui doit survivre aux mises à jour est dans /data (monté depuis ./data sur la VM)
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server/index.js"]
