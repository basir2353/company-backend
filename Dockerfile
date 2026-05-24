# Gemivora CMS API — Docker image for Render (free tier)
# On start: prisma db push + seed, then API server.
# Render: leave Docker Command empty; Pre-Deploy is paid-only.

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# --- Production image ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/
COPY docker-entrypoint.sh ./

RUN npm ci --omit=dev && \
    npx prisma generate && \
    chmod +x docker-entrypoint.sh && \
    mkdir -p uploads

COPY --from=builder /app/dist ./dist

EXPOSE 4000

# Use CMD only (no ENTRYPOINT) so Render never treats the whole shell string as one binary.
CMD ["./docker-entrypoint.sh", "node", "dist/index.js"]
