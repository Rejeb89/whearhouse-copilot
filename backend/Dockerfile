FROM node:18-bullseye-slim AS builder
WORKDIR /usr/src/app

# Install native build dependencies
RUN apt-get update && apt-get install -y python3 python3-dev build-essential make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN ln -sf /usr/bin/python3 /usr/bin/python || true

# Install dependencies (cache layer)
COPY package.json package-lock.json* ./
RUN npm install
RUN npm rebuild bcrypt --build-from-source || true

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build || true

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:18-bullseye-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy only what's needed for production
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/seed.js ./

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
