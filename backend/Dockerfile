# Gemivora CMS API — production Docker image for Render
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
    npm install prisma tsx --no-save && \
    npx prisma generate && \
    chmod +x docker-entrypoint.sh && \
    mkdir -p uploads

COPY --from=builder /app/dist ./dist

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
