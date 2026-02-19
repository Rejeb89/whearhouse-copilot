# Warehouse Management System

This repository contains a production-ready Warehouse Management System scaffold:

- Frontend: React + TypeScript + Vite + Tailwind + shadcn-style components
- Backend: Node.js + Express + TypeScript + Prisma
- Database: PostgreSQL
- Auth: JWT
- Containerization: Docker + Docker Compose

Quick start (requires Docker):

```bash
docker compose up --build
```

Notes:
- After the DB starts, run Prisma migrate/generate inside the backend container or locally:

```bash
# from backend folder
npm ci
npx prisma generate
npx prisma db push
npm run build
npm start
```

- Frontend dev:

```bash
cd frontend
npm ci
npm run dev
```

Environment variables are exemplified in `backend/.env.example` and `frontend/.env`.
