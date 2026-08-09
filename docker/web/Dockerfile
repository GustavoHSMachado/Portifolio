# ==========================================================
#  Web — Next.js 14
#
#  Contexto de build: raiz do repositório.
#  Alvos:
#    dev   next dev com hot reload por bind mount
#    prod  standalone, imagem mínima, usuário sem privilégio
# ==========================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---------- dependências ----------
FROM base AS deps
COPY v2/frontend/package.json v2/frontend/package-lock.json* ./
# npm ci exige o lockfile; sem ele caímos em install para o primeiro boot.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---------- desenvolvimento ----------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY v2/frontend/ /app/
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- build de produção ----------
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY v2/frontend/ /app/
RUN npm run build

# ---------- produção ----------
FROM base AS prod
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário sem privilégio: container rodando como root é risco desnecessário.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
