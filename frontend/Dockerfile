FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Install dependencies (cache layer)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/vite.config.ts ./

EXPOSE 3000
CMD ["npm", "run", "preview"]
