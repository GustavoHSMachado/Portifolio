# ==========================================================
#  Web — Next.js 14
#
#  Contexto de build: raiz do repositório.
#  Alvos:
#    dev   next dev com hot reload por bind mount
#    prod  standalone, imagem mínima, usuário sem privilégio
# ==========================================================

# Base em Debian slim, e não em Alpine.
#
# O Next compila com o SWC, que é um binário nativo com variante por libc. O
# package-lock.json foi gerado fora do Alpine e suas entradas não trazem o campo
# "libc", então o npm instalava apenas a variante glibc — que no Alpine falha com
# "Error relocating ... __register_atfork: symbol not found" e derrubava o
# `npm run build` do estágio de produção. Em Debian a variante glibc é a certa
# e o mesmo lockfile serve os dois lados.
FROM node:20-bookworm-slim AS base
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
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
