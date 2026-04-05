# 📚 Warehouse-Copilot: Complete Technical Documentation

## Table of Contents

- [System Architecture](#-system-architecture)
- [Technical Stack](#-technical-stack)
- [Frontend Architecture](#-frontend-architecture)
- [Backend Architecture](#-backend-architecture)
- [Database Schema](#-database-schema)
- [Security Implementation](#-security-implementation)
- [API Reference](#-api-reference)
- [Data Flow Diagrams](#-data-flow-diagrams)
- [Deployment Guide](#-deployment-guide)
- [Development Guide](#-development-guide)

---

# 🏗 System Architecture

## Overall Design

**Warehouse-Copilot** follows a **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 18 + Vite)                   │
│  - Pages:  17 views         - Components: 50+ reusable           │
│  - Services: API client     - Context: Auth state management     │
│  - State: TanStack Query    - Storage: localStorage for auth     │
└───────────────────────┬───────────────────────────────────────────┘
                        │ HTTP/REST (JWT in headers)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Express + TypeScript)                   │
│  - Routes:   18 controller groups                                 │
│  - Services: 17 business logic components                         │
│  - Middleware: 7 auth/logging/error handlers                      │
│  - Validation: Zod schemas for all inputs                         │
└───────────────────────────────────┬───────────────────────────────┘
                                    │ SQL (Prisma ORM)
                                    ▼
                        ┌────────────────────────────┐
                        │  PostgreSQL 15 Database    │
                        │  - 17 tables/models        │
                        │  - Row-Level Security      │
                        │  - Audit logging enabled   │
                        └────────────────────────────┘
```

## Key Design Principles

1. **Separation of Concerns**
   - Controllers handle HTTP logic only
   - Services contain pure business logic
   - Utilities provide reusable functions

2. **Type Safety**
   - 100% TypeScript coverage
   - Runtime validation with Zod
   - Prisma type generation

3. **Security First**
   - Role-based access control (RBAC)
   - Row-level security (RLS) via AsyncLocalStorage
   - All passwords hashed with bcryptjs
   - JWT tokens with 8-hour expiration

4. **Auditability**
   - Complete audit trail in database
   - Request logging middleware
   - User action tracking

---

# 🛠 Technical Stack

## Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI component library |
| TypeScript | 5.1 | Type safety |
| Vite | 5.0 | Build tool & dev server |
| Tailwind CSS | 3.4 | Styling framework |
| TanStack Query | 4.35 | Server state management |
| Axios | 1.4 | HTTP client |
| Recharts | 2.10 | Chart visualization |
| Visx | 3.x | Advanced chart components |
| jsPDF + html2canvas | Latest | PDF export |
| xlsx | 0.18 | Excel export |
| QRCode | 1.5 | QR code generation |
| React Router | 6.14 | Client-side routing |
| Lucide Icons | Latest | Icon library |

## Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Express | 4.18 | Web framework |
| TypeScript | 5.1 | Type safety |
| Prisma ORM | 5.0 | Database access layer |
| PostgreSQL | 15 | Relational database |
| JWT | 9.0 | Token-based authentication |
| bcryptjs | 2.4 | Password hashing |
| Zod | 3.22 | Schema validation |
| CORS | 2.8 | Cross-origin support |
| dotenv | 16.1 | Environment management |

## Infrastructure Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24+ | Container platform |
| Docker Compose | 2.x | Multi-container orchestration |
| PostgreSQL Image | 15-alpine | Lightweight database image |
| Node Image | 18-bullseye | Lean Node.js runtime |

---

# 📱 Frontend Architecture

## Pages (17 Total)

### Authentication
- **Login.tsx** - User login with email/password + remember me

### Core Inventory Management
- **Dashboard.tsx**
  - Overview of key statistics
  - Low stock items alerts (3 items max, specific categories)
  - Quick action buttons
  - Role-specific data filtering

- **Items.tsx**
  - Inventory list
  - Create/edit/delete items
  - Stock management interface
  - Bulk import from Excel

- **Receptions.tsx**
  - Track incoming items from suppliers
  - Associate with purchase orders
  - Record reference and collection details
  - Update stock automatically

- **Distributions.tsx**
  - Track outgoing items to beneficiaries
  - Associate with benefit entities
  - Generate delivery receipts
  - Update stock automatically

### Entity Management
- **Entities.tsx**
  - Manage suppliers and beneficiaries
  - Categorize by type
  - View detailed contact information

- **EntityDetails.tsx**
  - View full entity information
  - Manage employees of entity
  - Track associated operations

### Fleet Management
- **Vehicles.tsx**
  - Register administrative vehicles
  - Track vehicle status (operational/broken)
  - Manage vehicle details

- **Fuel.tsx**
  - Track fuel prices
  - Record fuel consumption by vehicle
  - View fuel statistics and trends

### Operations
- **Calendar.tsx**
  - Date-based event calendar
  - View operations by date
  - Quick access to daily summaries

- **Receipts.tsx**
  - Manage delivery receipts
  - Print receipts with QR codes
  - Track receipt approvals

- **Projects.tsx**
  - Register construction/development projects
  - Track project progress
  - Manage project resources

- **Budgets.tsx**
  - Allocate budgets to departments
  - Track expenses
  - Monitor budget utilization

### Administration
- **Settings.tsx**
  - User management (create/edit/block users)
  - System configuration
  - Role assignment

- **Logs.tsx**
  - Search and filter activity logs
  - Advanced filtering options
  - Export log reports

- **AdminMonitoring.tsx**
  - Central dashboard for monitoring roles
  - View all units (for ADMIN)
  - Unit-specific dashboards
  - Monitoring charts and statistics

## Component Structure

### Layout Components
```
components/common/
├── Layout.tsx          - Main app shell with sidebar + header
├── Sidebar.tsx         - Navigation menu with role-based visibility
├── TopBar.tsx          - Header with user profile + logout
├── GlobalSearch.tsx    - Application-wide unified search
└── Breadcrumbs.tsx     - Navigation path
```

### Modal Components (CRUD Operations)
```
components/modals/
├── ItemModal.tsx             - Create/edit items
├── ReceptionModal.tsx        - Create/edit receptions
├── DistributionModal.tsx     - Create/edit distributions
├── EntityModal.tsx           - Create/edit entities
├── EmployeeModal.tsx         - Create/edit employees
├── VehicleModal.tsx          - Create/edit vehicles
├── BudgetModal.tsx           - Create/edit budgets
├── FuelModal.tsx             - Create/edit fuel records
├── ProjectModal.tsx          - Create/edit projects
├── ExcelImportModal.tsx      - Bulk import from Excel
└── UserModal.tsx             - Create/edit users
```

### Chart Components
```
components/charts/
├── LowStockChordChart.tsx    - Chord diagram for inventory status
├── FuelThresholdChart.tsx    - Fuel consumption trends
├── DistributionChart.tsx     - Distribution statistics
├── ReceptionChart.tsx        - Reception analytics
├── BudgetChart.tsx           - Budget utilization
└── TrendChart.tsx            - Historical trends
```

### Receipt Components
```
components/receipts/
├── ReceiptTemplate.tsx       - PDF receipt template
├── QRCodeComponent.tsx       - QR code generation
└── ReceiptPrint.tsx          - Print-friendly receipt
```

## Services & Utilities

### API Client Setup

```typescript
// frontend/src/services/client.ts
import axios from 'axios';

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for JWT injection
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Authentication Context

```typescript
// frontend/src/context/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Provides:
- User state management
- Token lifecycle
- Auto-logout on token expiry
- localStorage persistence
```

### State Management Pattern

Using **TanStack Query** for server state:

```typescript
// Query pattern
const { data: items, isLoading, error } = useQuery({
  queryKey: ['items'],
  queryFn: () => client.get('/items'),
});

// Mutation pattern
const { mutate: createItem } = useMutation({
  mutationFn: (data) => client.post('/items', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});
```

### Styling Strategy

**Tailwind CSS** with custom CSS variables:

```css
:root {
  /* Color palette */
  --color-primary: #3B82F6;      /* Blue */
  --color-secondary: #10B981;    /* Green */
  --color-danger: #EF4444;       /* Red */
  --color-warning: #F59E0B;      /* Orange */
  --color-info: #06B6D4;         /* Cyan */
  
  /* RTL support */
  --text-direction: rtl;
  --margin-start: margin-right;
  --margin-end: margin-left;
}
```

---

# 🔧 Backend Architecture

## Routes Organization

```
backend/src/routes/
├── auth.ts              [POST /login, /register, GET /profile]
├── items.ts             [CRUD + stock operations]
├── receptions.ts        [Reception CRUD]
├── distributions.ts     [Distribution CRUD + receipt auto-generation]
├── entities.ts          [Entity CRUD + employee management]
├── employees.ts         [Employee CRUD]
├── vehicles.ts          [Vehicle CRUD + status]
├── budgets.ts           [Budget CRUD + expense tracking]
├── receipts.ts          [Receipt approval/cancellation]
├── fuel.ts              [Fuel prices + consumption records]
├── projects.ts          [Project CRUD + statistics]
├── users.ts             [User CRUD + account blocking]
├── logs.ts              [Activity log queries]
├── audit.ts             [Audit trail queries]
├── monitoring.ts        [Multi-unit monitoring data]
├── search.ts            [Global cross-entity search]
├── data.ts              [Export/import/clear operations]
└── index.ts             [Route aggregator]
```

## Controllers Layer

Each controller handles **HTTP request/response** only:

```typescript
export const createItem = async (req: Request, res: Response) => {
  try {
    const data = createItemSchema.parse(req.body);
    const result = await itemService.create(data);
    res.json(result);
  } catch (error) {
    // Error handled by global error handler
    next(error);
  }
};
```

## Services Layer

Pure business logic with **no Express dependencies**:

```typescript
// itemService.ts
export const create = async (data: CreateItemInput) => {
  // Validate stock constraints
  if (data.quantity < 0) throw new Error('Invalid quantity');
  
  // Create in database
  return prisma.item.create({ data });
};
```

## Middleware Stack

### 1. Authentication Guard
```typescript
// authGuard.ts
- Verifies JWT signature
- Extracts user information
- Sets user in request context
- Throws 401 if token invalid
```

### 2. Role Guard
```typescript
// roleGuard.ts
- Checks if user role matches allowed roles
- Throws 403 if not authorized
- Example: roleGuard(['ADMIN', 'SECTION_CHIEF'])
```

### 3. Security Unit Context
```typescript
// securityUnitContext.ts
- Stores security unit in AsyncLocalStorage
- Enables transparent Row-Level Security
- Automatic query filtering in Prisma
```

### 4. Request Logger
```typescript
// requestLogger.ts
- Logs all incoming HTTP requests
- Records method, path, user, duration
- Creates audit trail
```

### 5. Error Handler
```typescript
// errorHandler.ts
- Catches all errors globally
- Humanizes Prisma errors to Arabic
- Returns structured JSON responses
- Logs errors for debugging
```

## Validation System

Using **Zod** for runtime schema validation:

```typescript
// validation/userSchemas.ts
export const createUserSchema = z.object({
  email: z.string().email('البريد غير صحيح'),
  password: z.string().min(6, 'كلمة المرور ضعيفة'),
  name: z.string(),
  role: z.enum(['USER', 'SECTION_CHIEF', 'ADMIN']),
  securityUnit: z.string().optional(),
});

// Usage
const data = createUserSchema.parse(req.body);
```

---

# 🗄 Database Schema

## Entity Relationship Diagram

```
User
├── receptions (created by)
├── distributions (created by)
├── deliveryReceipts (initiated by)
└── auditLogs (performed by)

Item
├── receptionItems (n-to-n via junction)
├── distributionItems (n-to-n via junction)
└── auditLogs (what changed)

Reception
├── receptionItems (1-to-n)
├── entity (supplier)
├── employee (collector)
└── user (created by)

Distribution
├── distributionItems (1-to-n)
├── entity (beneficiary)
├── employee (assigned to)
├── user (created by)
└── deliveryReceipt (1-to-1)

Entity
├── employees (1-to-n)
├── distributions (beneficiary)
├── receptions (supplier)
└── vehicles (related)

Employee
├── entity (parent)
├── distributions (assigned to)
└── receptions (collected for)

Vehicle
├── entity (parent)
├── fuelRecords (1-to-n)
└── auditLogs

Budget
├── budgetExpenses (1-to-n)
├── supplyRequests (1-to-n)
└── auditLogs

Project
├── projectResources (1-to-n)
├── entity (managed by)
└── auditLogs

Log & AuditLog
└── related entity references
```

## 17 Data Models

### 1. User
```prisma
model User {
  id               Int     @id @default(autoincrement())
  email            String  @unique
  password         String  // bcrypt hashed
  name             String
  role             Role    @default(USER)
  personalNumber   String?
  securityUnit     String? @db.Text          // RLS filter
  region           String?
  regionChief      String?
  title            String?
  blocked          Boolean @default(false)
  
  createdAt        DateTime @default(now())
  
  receptions       Reception[]
  distributions    Distribution[]
  logs             Log[]
  
  @@index([email])
  @@index([role])
  @@index([securityUnit])
}
```

### 2. Item
```prisma
model Item {
  id                  Int     @id @default(autoincrement())
  name                String
  category            String?  // "طب", "مساعدات", "معدات", etc
  description         String?  @db.Text
  quantity            Int     @default(0)
  lowStockThreshold   Int?
  securityUnit        String? @db.Text          // RLS filter
  
  createdAt           DateTime @default(now())
  
  receptionItems      ReceptionItem[]
  distributionItems   DistributionItem[]
  logs                Log[]
  
  @@index([category])
  @@index([securityUnit])
}
```

### 3. Reception
```prisma
model Reception {
  id              Int     @id @default(autoincrement())
  reference       String  @unique
  referenceNumber String?
  referenceType   String?  // "فاتورة", "توصيل", "إيصال"
  referenceDate   DateTime?
  notes           String? @db.Text
  
  supplierId      Int?
  supplier        Entity? @relation("receptionSupplier", fields: [supplierId], references: [id])
  
  collectorId     Int?
  collector       Employee? @relation("receptionCollector", fields: [collectorId], references: [id])
  
  userId          Int
  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  securityUnit    String? @db.Text          // RLS filter
  
  createdAt       DateTime @default(now())
  
  items           ReceptionItem[]
  logs            Log[]
  
  @@index([supplierId])
  @@index([userId])
  @@index([securityUnit])
}
```

### 4. ReceptionItem
```prisma
model ReceptionItem {
  id          Int @id @default(autoincrement())
  
  receptionId Int
  reception   Reception @relation(fields: [receptionId], references: [id], onDelete: Cascade)
  
  itemId      Int
  item        Item @relation(fields: [itemId], references: [id])
  
  quantity    Int
  adminNumber String?
  
  @@unique([receptionId, itemId])
}
```

### 5. Distribution
```prisma
model Distribution {
  id              Int     @id @default(autoincrement())
  reference       String  @unique
  referenceType   String?
  referenceNumber String?
  referenceDate   DateTime?
  deliveredByName String?
  notes           String? @db.Text
  
  userId          Int
  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  beneficiaryId   Int?
  beneficiary     Entity? @relation("distributionBeneficiary", fields: [beneficiaryId], references: [id])
  
  assignedToId    Int?
  assignedTo      Employee? @relation(fields: [assignedToId], references: [id])
  
  securityUnit    String? @db.Text          // RLS filter
  
  createdAt       DateTime @default(now())
  
  items           DistributionItem[]
  receipt         DeliveryReceipt?
  logs            Log[]
  
  @@index([beneficiaryId])
  @@index([userId])
  @@index([securityUnit])
}
```

### 6. DistributionItem
```prisma
model DistributionItem {
  id              Int     @id @default(autoincrement())
  
  distributionId  Int
  distribution    Distribution @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  
  itemId          Int
  item            Item @relation(fields: [itemId], references: [id])
  
  quantity        Int
  serialNumber    String?  // "SPL-2026-0001"
  adminNumber     String?
  condition       ItemCondition @default(NEW)
  notes           String?
  
  @@unique([distributionId, itemId])
}

enum ItemCondition {
  NEW
  USED
  NEEDS_MAINTENANCE
}
```

### 7. Entity
```prisma
model Entity {
  id              Int     @id @default(autoincrement())
  name            String
  type            EntityType  // SUPPLIER | BENEFICIARY
  category        String  @default("OTHER")
  subCategory     String?
  
  phone           String
  unitHead        String?
  unitHeadPhone   String?
  
  securityUnit    String? @db.Text          // RLS filter
  
  createdAt       DateTime @default(now())
  
  employees       Employee[]
  distributionsAs Beneficiary  @relation("distributionBeneficiary")
  receptionsSent  Reception[]  @relation("receptionSupplier")
  vehicles        Vehicle[]
  projects        Project[]
  
  @@index([type])
  @@index([securityUnit])
}

enum EntityType {
  SUPPLIER
  BENEFICIARY
}
```

### 8. Employee
```prisma
model Employee {
  id          Int     @id @default(autoincrement())
  
  entityId    Int
  entity      Entity @relation(fields: [entityId], references: [id], onDelete: Cascade)
  
  rank        String
  name        String
  surname     String
  number      String  @unique
  phone       String?
  
  createdAt   DateTime @default(now())
  
  distributions Distribution[]
  receptions  Reception[]  @relation("receptionCollector")
  
  @@index([entityId])
}
```

### 9. Vehicle
```prisma
model Vehicle {
  id            Int     @id @default(autoincrement())
  
  entityId      Int
  entity        Entity @relation(fields: [entityId], references: [id], onDelete: Cascade)
  
  plate         String
  vin           String?
  manufacturer  String?
  model         String?
  color         String?
  engineNumber  String?
  
  status        VehicleStatus @default(OPERATIONAL)
  securityUnit  String? @db.Text
  
  createdAt     DateTime @default(now())
  
  fuelRecords   FuelRecord[]
  logs          Log[]
  
  @@index([entityId])
  @@index([status])
  @@index([securityUnit])
}

enum VehicleStatus {
  OPERATIONAL
  BROKEN
}
```

### 10. FuelPrice
```prisma
model FuelPrice {
  id          Int     @id @default(autoincrement())
  date        DateTime @unique
  price       Float   // Price per liter
  
  createdAt   DateTime @default(now())
}
```

### 11. FuelRecord
```prisma
model FuelRecord {
  id          Int     @id @default(autoincrement())
  
  vehicleId   Int
  vehicle     Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  
  liters      Float
  cost        Float
  date        DateTime
  mileage     Int?
  notes       String?
  
  createdAt   DateTime @default(now())
  
  @@index([vehicleId])
  @@index([date])
}
```

### 12. Budget
```prisma
model Budget {
  id              Int     @id @default(autoincrement())
  name            String
  allocatedAmount Float
  year            Int
  
  allocated       DateTime @default(now())
  
  expenses        BudgetExpense[]
  supplyRequests  SupplyRequest[]
  logs            Log[]
}
```

### 13. BudgetExpense
```prisma
model BudgetExpense {
  id        Int     @id @default(autoincrement())
  
  budgetId  Int
  budget    Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  
  amount    Float
  date      DateTime
  details   String?
  
  @@index([budgetId])
}
```

### 14. Project
```prisma
model Project {
  id          Int     @id @default(autoincrement())
  name        String
  description String? @db.Text
  
  entityId    Int
  entity      Entity @relation(fields: [entityId], references: [id])
  
  startDate   DateTime
  endDate     DateTime?
  progress    Int @default(0)  // 0-100
  
  createdAt   DateTime @default(now())
  
  resources   ProjectResource[]
  logs        Log[]
}
```

### 15. ProjectResource
```prisma
model ProjectResource {
  id        Int @id @default(autoincrement())
  
  projectId Int
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  resource  String
  quantity  Int
}
```

### 16. DeliveryReceipt
```prisma
model DeliveryReceipt {
  id              Int     @id @default(autoincrement())
  
  distributionId  Int     @unique
  distribution    Distribution @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  
  serialNumber    String  @unique  // "BL-2026-0001"
  status          DeliveryStatus @default(DRAFT)
  approvedAt      DateTime?
  approvedBy      String?
  
  createdAt       DateTime @default(now())
  
  @@index([status])
}

enum DeliveryStatus {
  DRAFT
  APPROVED
  CANCELLED
}
```

### 17. Log / AuditLog
```prisma
model Log {
  id            Int     @id @default(autoincrement())
  
  userId        Int
  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  action        String  // "CREATE", "UPDATE", "DELETE"
  entity        String  // "Item", "Reception", etc
  entityId      Int
  
  oldValues     Json?
  newValues     Json?
  
  ipAddress     String?
  userAgent     String?
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([entity])
  @@index([createdAt])
}
```

## Row-Level Security (RLS) Implementation

Using **AsyncLocalStorage** + **Prisma Extension**:

```typescript
// backend/src/config/database.ts
const securityUnitContext = new AsyncLocalStorage<string>();

export const prisma = new PrismaClient().$extends({
  query: {
    item: {
      findMany({ args, query }) {
        const unit = securityUnitContext.getStore();
        if (unit && !isAdmin()) {
          args.where = { ...args.where, securityUnit: unit };
        }
        return query(args);
      },
    },
    // ... same for 6 other sensitive tables
  },
});
```

**7 Protected Tables:**
- Item
- Reception
- Distribution
- Entity
- Vehicle
- Budget
- Log

**Transparent Filtering:**
- Applied automatically in every query
- No WHERE clause needed in services
- ADMIN users bypass filtering

---

# 🔐 Security Implementation

## Authentication Architecture

### JWT Token Strategy

```typescript
// backend/src/utils/jwt.ts
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
    securityUnit: user.securityUnit,
  },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }  // 8-hour expiration
);
```

### Password Hashing

```typescript
// backend/src/utils/hash.ts
import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);  // 10 salt rounds
};

export const comparePasswords = async (plain: string, hashed: string) => {
  return bcrypt.compare(plain, hashed);
};
```

## Authorization System

### Role Hierarchy

```typescript
type Role = 
  | 'ADMIN'              // System administrator - all resources
  | 'SECTION_CHIEF'      // Unit manager - own unit only
  | 'USER'               // Regular user - own unit only
  | 'REGION_CHIEF'       // Monitoring - view only (own region)
  | 'BATTALION_COMMANDER' // Monitoring - view only (own battalion)
  | 'DISTRICT_MANAGER'   // Monitoring - view only (own district)

// Permission matrix
const permissions = {
  ADMIN: ['create', 'read', 'update', 'delete'],
  SECTION_CHIEF: ['create', 'read', 'update', 'delete'], // own unit
  USER: ['create', 'read'],  // own unit
  REGION_CHIEF: ['read'],    // region only
  BATTALION_COMMANDER: ['read'], // battalion only
  DISTRICT_MANAGER: ['read'],    // district only
};
```

## Data Protection

### Encryption at Rest
- PostgreSQL data encrypted if filesystem-level encryption enabled
- Passwords always hashed (bcrypt, never stored plaintext)

### Encryption in Transit
- HTTPS in production (configure reverse proxy)
- JWT in Authorization header (not in cookies)

### Database Safety
- Cascading deletes for referential integrity
- Soft deletes possible (add `deletedAt` field)
- Backup strategy in production

## Security Headers

```typescript
// backend/src/app.ts
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

// CORS whitelist
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://yourdomain.com'
];
```

## Input Validation

```typescript
// All endpoints use Zod schemas
const createItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().optional(),
});

// Validated at route level
router.post('/', (req, res) => {
  const data = createItemSchema.parse(req.body); // throws if invalid
  await itemService.create(data);
});
```

## Security Vulnerability Fixes

### Fixed Vulnerabilities

#### 1. Hardcoded Admin Credentials
```typescript
// BEFORE (vulnerable)
const existingAdmin = await prisma.user.findUnique({
  where: { email: 'admin@gn.tn' }
});
if (!existingAdmin) {
  await prisma.user.create({
    data: {
      email: 'admin@gn.tn',
      password: bcrypt.hashSync('admin123', 10), // ❌ hardcoded
    }
  });
}

// AFTER (secure)
const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
if (adminEmail && adminPassword && !existingAdmin) {
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: await hashPassword(adminPassword),
    }
  });
}
```

#### 2. Overly Permissive CORS
```typescript
// BEFORE (vulnerable)
app.use(cors()); // ❌ allows ANY origin

// AFTER (secure)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

#### 3. Default Passwords in Data Import
```typescript
// BEFORE (vulnerable)
const defaultPasswordHash = await hashPassword('admin123');
for (const user of importedUsers) {
  await prisma.user.create({
    data: {
      ...user,
      password: defaultPasswordHash, // ❌ all users same password
    }
  });
}

// AFTER (secure)
import crypto from 'crypto';
for (const user of importedUsers) {
  const tempPassword = crypto.randomBytes(12).toString('hex');
  await prisma.user.create({
    data: {
      ...user,
      password: await hashPassword(tempPassword),
    }
  });
}
```

#### 4. Hardcoded Database Password
```typescript
// BEFORE (vulnerable)
const appUserPassword = 'app_secure_2024'; // ❌ hardcoded

// AFTER (secure)
const appUserPassword = process.env.APP_DB_PASSWORD || 'app_secure_2024_dev';
```

---

# 📊 API Reference

## Authentication Endpoints

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Ahmed",
    "role": "USER",
    "securityUnit": "وحدة مثال"
  }
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "strong_password",
  "name": "New User",
  "role": "USER",
  "securityUnit": "وحدة مثال"
}
```

### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer {token}

Response:
{
  "id": 1,
  "email": "user@example.com",
  "name": "Ahmed",
  "role": "USER",
  "securityUnit": "وحدة مثال"
}
```

## Items Endpoints

```http
GET    /api/items                    # List items
GET    /api/items/:id                # Get item
POST   /api/items                    # Create item
PUT    /api/items/:id                # Update item
DELETE /api/items/:id                # Delete item
GET    /api/items/low-stock          # Get low stock items
GET    /api/items/statistics         # Item statistics
```

## Receptions Endpoints

```http
GET    /api/receptions               # List receptions
GET    /api/receptions/:id           # Get reception
POST   /api/receptions               # Create reception
PUT    /api/receptions/:id           # Update reception
DELETE /api/receptions/:id           # Delete reception
```

## Distributions Endpoints

```http
GET    /api/distributions            # List distributions
GET    /api/distributions/:id        # Get distribution
POST   /api/distributions            # Create distribution (auto-generates receipt)
PUT    /api/distributions/:id        # Update distribution
DELETE /api/distributions/:id        # Delete distribution
```

## Entities Endpoints

```http
GET    /api/entities                 # List entities
GET    /api/entities/:id             # Get entity with employees
POST   /api/entities                 # Create entity
PUT    /api/entities/:id             # Update entity
DELETE /api/entities/:id             # Delete entity
GET    /api/entities/:id/employees   # Get entity employees
```

## Vehicles Endpoints

```http
GET    /api/vehicles                 # List vehicles
GET    /api/vehicles/:id             # Get vehicle
POST   /api/vehicles                 # Create vehicle
PUT    /api/vehicles/:id             # Update vehicle status
DELETE /api/vehicles/:id             # Delete vehicle
```

## Budgets Endpoints

```http
GET    /api/budgets                  # List budgets
GET    /api/budgets/:id              # Get budget with expenses
POST   /api/budgets                  # Create budget
POST   /api/budgets/:id/expenses     # Add expense
DELETE /api/budgets/:id/expenses/:expenseId
```

## Users Endpoints
```http
GET    /api/users                    # List users
GET    /api/users/:id                # Get user
POST   /api/users                    # Create user
PUT    /api/users/:id                # Update user
DELETE /api/users/:id                # Delete user
PATCH  /api/users/:id/block          # Block user account
PATCH  /api/users/:id/unblock        # Unblock user account
```

## Logs Endpoints
```http
GET    /api/logs                     # List activity logs
GET    /api/logs?action=CREATE       # Filter by action
GET    /api/logs?entity=Item         # Filter by entity
GET    /api/logs?userId=1            # Filter by user
```

## Monitoring Endpoints (Admin/REGION_CHIEF only)
```http
GET    /api/monitoring/units         # List all units (summary)
GET    /api/monitoring/units/:unit   # Unit details
GET    /api/monitoring/dashboard     # Central dashboard
```

## Data Export Endpoints
```http
GET    /api/data/export/items        # Export items to CSV
GET    /api/data/export/report       # Export full report
POST   /api/data/import              # Import from file
DELETE /api/data/clear               # Clear all data
```

---

# 🔄 Data Flow Diagrams

## Reception Flow

```
┌─────────────────────────────────┐
│  Supplier sends items           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  User creates Reception         │
│  - Select supplier              │
│  - Select items & quantities    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  System validates:              │
│  - Item exists                  │
│  - Quantity > 0                 │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Create ReceptionItem records   │
│  Update Item.quantity += qty    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Create audit log entry         │
│  (who, when, what changed)      │
└─────────────────────────────────┘
```

## Distribution Flow

```
┌─────────────────────────────────┐
│  User requests distribution     │
│  - Select beneficiary           │
│  - Select items & quantities    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  System validates:              │
│  - Item stock >= requested      │
│  - Item not low stock threshold │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Create DistributionItem        │
│  Decrement Item.quantity -= qty │
│  Generate serial number         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Auto-create DeliveryReceipt    │
│  - Generate serial (BL-2026-01) │
│  - Status: DRAFT                │
│  - Awaiting approval            │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  SECTION_CHIEF approves receipt │
│  - Status: APPROVED             │
│  - Email notification sent      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Create audit log entry         │
│  (distribution created, receipt │
│   approved, items deducted)     │
└─────────────────────────────────┘
```

## User Authentication Flow

```
┌──────────────────────────────┐
│  User enters email/password  │
│  (Frontend)                  │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  POST /api/auth/login        │
│  (Backend receives request)  │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  1. Find user by email       │
│  2. Compare password hashes  │
│  3. Generate JWT token       │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Return token + user info    │
│  (Frontend stores in storage)│
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Subsequent requests:        │
│  - Inject JWT in headers     │
│  - authGuard verifies token  │
│  - Continue to route handler │
└──────────────────────────────┘
```

---

# 🚀 Deployment Guide

## Docker Deployment (Recommended)

### Production Environment Setup

1. **Copy `.env.example` to `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with production values:**
   ```env
   NODE_ENV=production
   POSTGRES_PASSWORD=<random_32_chars>
   APP_DB_PASSWORD=<random_32_chars>
   JWT_SECRET=<random_32_chars>
   ALLOWED_ORIGINS=https://yourdomain.com
   INITIAL_ADMIN_EMAIL=admin@yourdomain.com
   INITIAL_ADMIN_PASSWORD=<random_32_chars>
   ```

3. **Build and run:**
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```

4. **Verify services:**
   ```bash
   docker compose ps
   docker compose logs backend --tail=50
   ```

### Scaling Considerations

- **Database:** Configure PostgreSQL backups
- **Backend:** Use load balancer (nginx reverse proxy)
- **Frontend:** Serve via CDN (CloudFlare, etc)

---

# 📖 Development Guide

## Local Development Setup

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Development

```bash
# Using Docker
docker compose up postgres -d

# Using local PostgreSQL
psql -U postgres -d warehouse
npx prisma db push
```

## Database Migrations

```bash
# Create migration
npx prisma migrate dev --name add_field

# View migrations
npx prisma migrate status

# Deploy to production
npx prisma migrate deploy
```

## Code Quality

```bash
# TypeScript type checking
npm run type-check

# ESLint
npm run lint

# Format code
npm run format
```

---

**End of Technical Documentation**

Last Updated: 2026-04-05
Version: 2.0.0

