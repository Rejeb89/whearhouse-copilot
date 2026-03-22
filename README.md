<div align="center">

#  Security Warehouse Management System
### Warehouse Management System

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<p>
  A full-stack warehouse and logistics management system for security units,<br/>
  featuring a multi-level central monitoring dashboard and an advanced role-based access system.
</p>

</div>

---

##  Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Roles & Permissions](#-roles--permissions)
- [Prerequisites](#-prerequisites)
- [Quick Start  Docker](#-quick-start--docker)
- [Manual Setup](#-manual-setup-development)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Overview](#-api-overview)
- [Database](#-database)
- [Contributing](#-contributing)
- [License](#-license)

---

##  Overview

A full-stack RTL web application built with React + Express that enables security units to manage:
- Equipment inventory (daily inbound and outbound)
- Administrative vehicles, beneficiary entities, and suppliers
- Financial budgets and invoices
- Delivery receipts with print support
- Operation logs and audit trails

A central monitoring dashboard gives administrators and district managers real-time visibility across all units.

---

##  Features

| Feature | Description |
|---------|-------------|
|  **Equipment Management** | Daily inbound/outbound with inventory tracking and low-stock alerts |
|  **Administrative Vehicles** | Register and track vehicles per entity |
|  **Entities** | Manage suppliers and beneficiary entities with employee rosters |
|  **Financial Budgets** | Track budgets, expenses, and supply requests |
|  **Delivery Receipts** | Create and print digital delivery receipts with QR code |
|  **Monitoring Dashboard** | Comprehensive view of all units with live statistics |
|  **Reports** | Export Excel and PDF reports for every module |
|  **Role System** | 5 roles with full permission separation |
|  **Audit Logs** | Complete tracking of every operation with a visual interface |
|  **Full RTL Support** | Complete Arabic UI with Cairo font |

---

##  Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + custom design with CSS Variables
- **TanStack Query v4**  state management and caching
- **Recharts** + **Visx**  interactive charts
- **react-router-dom v6**  client-side routing
- **jsPDF** + **html2canvas** + **xlsx**  report exports

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM v5**  database management
- **PostgreSQL 15**  primary database
- **JWT**  authentication and authorization
- **Zod**  input validation
- **bcryptjs**  password hashing

### Infrastructure
- **Docker** + **Docker Compose**  containerization
- **Row-Level Security** via AsyncLocalStorage + Prisma Extension

---

##  Roles & Permissions

| Role | Access | Description |
|------|--------|-------------|
| `ADMIN` | Monitoring dashboard + Settings | System administrator, no unit-specific data |
| `SECTION_CHIEF` | Full access | Unit chief with full permissions on their unit |
| `USER` | Limited | Regular user, read and create only |
| `REGION_CHIEF` | Monitor own unit | Redirected directly to their unit's dashboard |
| `DISTRICT_MANAGER` | Monitor all district units | Views all units within their district |

> `REGION_CHIEF` and `DISTRICT_MANAGER` have **read-only** access  no edit or delete buttons are shown.

---

##  Prerequisites

| Tool | Minimum Version |
|------|----------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ |
| Node.js *(dev only)* | 18+ |
| npm *(dev only)* | 9+ |

---

##  Quick Start  Docker

The fastest way to run the full project with a single command:

```bash
git clone https://github.com/your-username/whearhouse-copilot.git
cd whearhouse-copilot
docker compose up --build
```

Once the build completes:

| Service | URL |
|---------|-----|
|  Frontend | http://localhost:3002 |
|  Backend API | http://localhost:4000 |
|  PostgreSQL | localhost:5434 |

### Default Credentials

To seed the database with sample data, run the following after the containers are up:

```bash
docker compose exec backend node seed.js
```

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@example.com | admin123 |

---

##  Manual Setup (Development)

### 1. Database

```bash
# Start PostgreSQL only via Docker
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Apply schema to the database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# (Optional) Seed sample data
node seed.js

# Start development server
npm run dev
```

>  Backend will be available at: **http://localhost:4000**

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

>  Frontend will be available at: **http://localhost:5173**

### 4. Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

---

##  Environment Variables

### `backend/.env`

```env
# Database connection (Prisma)
DATABASE_URL=postgres://postgres:postgres@localhost:5434/warehouse

# JWT secret key  change this in production!
JWT_SECRET=supersecret_jwt_key

# Low quantity threshold for stock alerts
LOW_STOCK_THRESHOLD=5

# Server port (optional, default 4000)
PORT=4000
```

### `frontend/.env`

```env
# Backend API URL
VITE_API_URL=http://localhost:4000
```

>  **Security Warning:** Never use the default `JWT_SECRET` value in a production environment.

---

##  Project Structure

```
whearhouse-copilot/
  docker-compose.yml
  README.md
 database/
    init.sql

 backend/                        # Node.js + Express + Prisma
    src/
       index.ts                # Server entry point
       app.ts                  # Express setup + Middleware
       config/                 # Database config and constants
       controllers/            # HTTP handlers for each resource
       services/               # Business Logic layer
       routes/                 # API route definitions
       middleware/
          authGuard.ts        # JWT validation
          roleGuard.ts        # Role-based protection
          securityUnitContext.ts  # Automatic Row-Level Security
          requestLogger.ts    # Request logging for audit
       types/                  # Shared TypeScript definitions
       utils/                  # Helpers (jwt, hash, errors)
       validation/             # Zod validation schemas
    prisma/
       schema.prisma           # Full database model definitions
    seed.js                     # Sample data seeder

 frontend/                       # React + TypeScript + Vite
     src/
        App.tsx                  # Routing + PrivateRoute + role guards
        main.tsx
        components/
           common/             # Layout, Sidebar, GlobalSearch
           charts/             # LowStockRadialChart, ChordChart
           modals/             # Create/edit data modals
           receipts/           # PDF print template + QR Code
        context/
           AuthContext.tsx     # Global auth context
        hooks/                  # Custom React Hooks
        pages/                  # All application pages
        services/
           client.ts           # Axios instance with JWT interceptors
        utils/                  # Helper functions (formatting, export...)
     index.html
```

---

##  API Overview

All routes are JWT-protected and prefixed with `/api`

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/auth/login` | `POST` | Login and receive Token | Public |
| `/items` | `GET / POST` | List and create equipment | `authGuard` |
| `/receptions` | `GET / POST` | Daily inbound operations | `authGuard` |
| `/distributions` | `GET / POST` | Daily outbound operations | `authGuard` |
| `/entities` | `GET / POST` | Entities (suppliers + beneficiaries) | `authGuard` |
| `/entities/:id` | `GET` | Entity details with employees | `authGuard` |
| `/vehicles` | `GET / POST / PATCH` | Administrative vehicles | `authGuard` |
| `/employees/:entityId` | `GET / POST` | Entity employees | `authGuard` |
| `/budgets` | `GET / POST` | Financial budgets | `authGuard` |
| `/receipts` | `GET / POST` | Delivery receipts | `authGuard` |
| `/users` | `GET` | User list | 4 roles |
| `/users/meta` | `GET` | Metadata (regions, units, titles) | 4 roles |
| `/audit` | `GET` | Visual audit log | 4 roles |
| `/monitoring/units` | `GET` | Statistical summary of all units | Monitoring Roles |
| `/monitoring/units/:unit/*` | `GET` | Detailed data for a unit | Monitoring Roles |
| `/data/stats` | `GET` | General system statistics | 4 roles |
| `/data/export` | `GET` | Full data export | ADMIN / SECTION_CHIEF |
| `/search` | `GET` | Global search across all entities | `authGuard` |
| `/logs` | `GET` | Operation logs | `authGuard` |

---

##  Database

### Core Data Models

```
User           Role: ADMIN | SECTION_CHIEF | USER | REGION_CHIEF | DISTRICT_MANAGER
Item           ReceptionItem     Reception     Entity (SUPPLIER / BENEFICIARY)
Item           DistributionItem  Distribution  Entity + Employee
Entity         Employee[]
Entity         Vehicle[]
Budget         Expense[] + SupplyRequest[]
Distribution   DeliveryReceipt
User / Reception / Distribution  Log (audit trail)
```

### Row-Level Security

Every user automatically sees **only their own security unit's data** (`securityUnit`) via a Prisma Query Extension built on AsyncLocalStorage.

Unrestricted roles (see all data):
- `ADMIN`  `REGION_CHIEF`  `DISTRICT_MANAGER`

---

##  Contributing

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request with a detailed description

### Code Standards

- Use strict TypeScript in both Backend and Frontend
- Follow RESTful conventions for API routes
- Add Zod input validation for every new endpoint
- Ensure Row-Level Security is respected for sensitive data

---

##  License

This project is licensed under the [MIT](LICENSE) License.

---

<div align="center">
  Made with  to serve security units
</div>