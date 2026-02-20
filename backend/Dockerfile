FROM node:18-bullseye-slim AS builder
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y python3 python3-dev build-essential make g++ && rm -rf /var/lib/apt/lists/*
RUN ln -sf /usr/bin/python3 /usr/bin/python || true
COPY package.json package-lock.json* ./
RUN npm install
RUN npm rebuild bcrypt --build-from-source || true
COPY . .
RUN npm run build

FROM node:18-bullseye-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=builder /usr/src/app .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
