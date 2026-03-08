<div align="center">

#  نظام إدارة المستودعات الأمني
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
  نظام متكامل لإدارة المستودعات والعمليات اللوجستية للوحدات الأمنية،<br/>
  مع لوحة مراقبة مركزية متعددة المستويات ونظام أدوار متقدم.
</p>

</div>

---

##  المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [المميزات](#-المميزات)
- [المكدس التقني](#-المكدس-التقني)
- [الأدوار والصلاحيات](#-الأدوار-والصلاحيات)
- [متطلبات التشغيل](#-متطلبات-التشغيل)
- [التشغيل السريع  Docker](#-التشغيل-السريع--docker)
- [التشغيل اليدوي](#-التشغيل-اليدوي-للتطوير)
- [متغيرات البيئة](#-متغيرات-البيئة)
- [بنية المشروع](#-بنية-المشروع)
- [API Overview](#-api-overview)
- [قاعدة البيانات](#-قاعدة-البيانات)

---

##  نظرة عامة

نظام ويب متكامل RTL مبني بـ React + Express يُتيح للوحدات الأمنية إدارة:
- جرد التجهيزات (استلام وتسليم يومي)  
- الوسائل الإدارية والجهات المنتفعة والموردين  
- الاعتمادات المالية والفواتير  
- وصولات التسليم مع دعم الطباعة  
- سجلات العمليات والتدقيق  

وتُوفّر لوحة مراقبة مركزية للمسؤولين وكبار الإقليم لمتابعة جميع الوحدات في الوقت الفعلي.

---

##  المميزات

| الميزة | الوصف |
|--------|-------|
|  **إدارة التجهيزات** | استلام وتسليم يومي مع تتبع المخزون وتنبيه النقص |
|  **الوسائل الإدارية** | تسجيل ومتابعة وسائل النقل لكل جهة |
|  **الجهات** | إدارة الموردين والجهات المنتفعة مع قوائم الموظفين |
|  **الاعتمادات المالية** | متابعة الميزانيات والمصاريف وطلبات التزود |
|  **وصولات التسليم** | إنشاء وطباعة وصولات رقمية مع رمز QR |
|  **لوحة المراقبة** | رؤية شاملة لجميع الوحدات بإحصاءات فورية |
|  **التقارير** | تصدير تقارير Excel و PDF لكل قسم |
|  **نظام أدوار** | 5 أدوار مع فصل كامل للصلاحيات |
|  **سجلات التدقيق** | تتبع كامل لكل عملية بالواجهة المرئية |
|  **RTL كامل** | واجهة عربية كاملة مع خط Cairo |

---

##  المكدس التقني

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + تصميم مخصص متوافق مع CSS Variables
- **TanStack Query v4**  إدارة الحالة والكاش
- **Recharts** + **Visx**  رسوم بيانية تفاعلية
- **react-router-dom v6**  التنقل بين الصفحات
- **jsPDF** + **html2canvas** + **xlsx**  تصدير التقارير

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM v5**  إدارة قاعدة البيانات
- **PostgreSQL 15**  قاعدة البيانات الرئيسية
- **JWT**  المصادقة والتوثيق
- **Zod**  التحقق من المدخلات
- **bcryptjs**  تشفير كلمات المرور

### Infrastructure
- **Docker** + **Docker Compose**  الحاويات
- **Row-Level Security** عبر AsyncLocalStorage + Prisma Extension

---

##  الأدوار والصلاحيات

| الدور | الوصول | الوصف |
|-------|--------|-------|
| `ADMIN` | لوحة المراقبة + الإعدادات | مسؤول النظام، لا يرى بيانات وحدة بعينها |
| `SECTION_CHIEF` | كامل | رئيس قسم، صلاحيات كاملة على وحدته |
| `USER` | محدود | مستخدم عادي، قراءة وإنشاء فقط |
| `REGION_CHIEF` | مراقبة وحدته | ينتقل مباشرة للوحة وحدته |
| `DISTRICT_MANAGER` | مراقبة كل وحدات الإقليم | يرى جميع الوحدات في إقليمه |

> الأدوار `REGION_CHIEF` و `DISTRICT_MANAGER` لها وصول قراءة فقط  بدون أزرار تعديل أو حذف.

---

##  متطلبات التشغيل

| الأداة | الإصدار الأدنى |
|--------|---------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ |
| Node.js *(للتطوير فقط)* | 18+ |
| npm *(للتطوير فقط)* | 9+ |

---

##  التشغيل السريع  Docker

أسرع طريقة لتشغيل المشروع كاملاً بأمر واحد:

```bash
git clone https://github.com/your-username/whearhouse-copilot.git
cd whearhouse-copilot
docker compose up --build
```

بعد اكتمال البناء:

| الخدمة | الرابط |
|--------|--------|
|  الواجهة الأمامية | http://localhost:3002 |
|  API الخلفية | http://localhost:4000 |
|  قاعدة البيانات (PostgreSQL) | localhost:5434 |

### بيانات الدخول الافتراضية

لإنشاء البيانات التجريبية، شغّل الأمر التالي بعد رفع الحاويات:

```bash
docker compose exec backend node seed.js
```

| الدور | البريد الإلكتروني | كلمة المرور |
|-------|-------------------|-------------|
| ADMIN | admin@example.com | admin123 |
| SECTION_CHIEF | chief@example.com | admin123 |
| DISTRICT_MANAGER | admin789@example.com | admin123 |

---

##  التشغيل اليدوي (للتطوير)

### 1. قاعدة البيانات

```bash
# تشغيل PostgreSQL فقط عبر Docker
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend

# تثبيت المكتبات
npm install

# إنشاء الجداول وتطبيق المخطط
npx prisma db push

# توليد Prisma Client
npx prisma generate

# (اختياري) بيانات تجريبية
node seed.js

# تشغيل وضع التطوير
npm run dev
```

>  الخلفية ستعمل على: **http://localhost:4000**

### 3. Frontend

```bash
cd frontend

# تثبيت المكتبات
npm install

# تشغيل وضع التطوير
npm run dev
```

>  الواجهة ستعمل على: **http://localhost:5173**

### 4. بناء للإنتاج

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

##  متغيرات البيئة

### `backend/.env`

```env
# اتصال قاعدة البيانات (Prisma)
DATABASE_URL=postgres://postgres:postgres@localhost:5434/warehouse

# مفتاح JWT السري  غيّره في الإنتاج!
JWT_SECRET=supersecret_jwt_key

# حد الكمية المنخفضة لتنبيهات المخزون
LOW_STOCK_THRESHOLD=5

# منفذ الخادم (اختياري، الافتراضي 4000)
PORT=4000
```

### `frontend/.env`

```env
# عنوان API الخلفية
VITE_API_URL=http://localhost:4000
```

>  **تنبيه أمني:** لا تستخدم `JWT_SECRET` الافتراضي في بيئة الإنتاج أبداً.

---

##  بنية المشروع

```
whearhouse-copilot/
  docker-compose.yml
  README.md
 database/
    init.sql

 backend/                        # Node.js + Express + Prisma
    src/
       index.ts                # نقطة دخول الخادم
       app.ts                  # إعداد Express + Middleware
       config/                 # إعداد قاعدة البيانات والثوابت
       controllers/            # معالجات HTTP لكل مورد
       services/               # منطق الأعمال (Business Logic)
       routes/                 # تعريف مسارات API
       middleware/
          authGuard.ts        # التحقق من صحة JWT
          roleGuard.ts        # حماية على أساس الدور
          securityUnitContext.ts  # Row-Level Security تلقائي
          requestLogger.ts    # تسجيل الطلبات للتدقيق
       types/                  # تعريفات TypeScript المشتركة
       utils/                  # أدوات مساعدة (jwt, hash, errors)
       validation/             # مخططات التحقق Zod
    prisma/
       schema.prisma           # تعريف كامل لنماذج البيانات
    seed.js                     # بيانات تجريبية

 frontend/                       # React + TypeScript + Vite
     src/
        App.tsx                  # التوجيه + PrivateRoute + حماية الأدوار
        main.tsx
        components/
           common/             # Layout, Sidebar, GlobalSearch
           charts/             # LowStockRadialChart, ChordChart
           modals/             # نوافذ إنشاء/تعديل البيانات
           receipts/           # قالب الطباعة PDF + QR Code
        context/
           AuthContext.tsx     # سياق المصادقة العام
        hooks/                  # Custom React Hooks
        pages/                  # جميع صفحات التطبيق
        services/
           client.ts           # Axios instance مع JWT interceptors
        utils/                  # دوال مساعدة (تنسيق, تصدير...)
     index.html
```

---

##  API Overview

جميع المسارات محمية بـ JWT وتبدأ بـ `/api`

| المسار | الطريقة | الوصف | الحماية |
|--------|---------|-------|---------|
| `/auth/login` | `POST` | تسجيل الدخول والحصول على Token | عام |
| `/items` | `GET / POST` | قائمة وإنشاء التجهيزات | `authGuard` |
| `/receptions` | `GET / POST` | الوارد اليومي | `authGuard` |
| `/distributions` | `GET / POST` | الصادر اليومي | `authGuard` |
| `/entities` | `GET / POST` | الجهات (موردون + منتفعون) | `authGuard` |
| `/entities/:id` | `GET` | تفاصيل جهة مع موظفيها | `authGuard` |
| `/vehicles` | `GET / POST / PATCH` | الوسائل الإدارية | `authGuard` |
| `/employees/:entityId` | `GET / POST` | موظفو جهة | `authGuard` |
| `/budgets` | `GET / POST` | الاعتمادات المالية | `authGuard` |
| `/receipts` | `GET / POST` | وصولات التسليم | `authGuard` |
| `/users` | `GET` | قائمة المستخدمين | 4 أدوار |
| `/users/meta` | `GET` | بيانات مساعدة (مناطق، وحدات، مسميات) | 4 أدوار |
| `/audit` | `GET` | سجل التدقيق المرئي | 4 أدوار |
| `/monitoring/units` | `GET` | ملخص إحصائي لجميع الوحدات | Monitoring Roles |
| `/monitoring/units/:unit/*` | `GET` | بيانات تفصيلية لوحدة | Monitoring Roles |
| `/data/stats` | `GET` | إحصاءات عامة للنظام | 4 أدوار |
| `/data/export` | `GET` | تصدير كامل للبيانات | ADMIN / SECTION_CHIEF |
| `/search` | `GET` | بحث عام في جميع الكيانات | `authGuard` |
| `/logs` | `GET` | سجلات العمليات | `authGuard` |

---

##  قاعدة البيانات

### نماذج البيانات الرئيسية

```
User           Role: ADMIN | SECTION_CHIEF | USER | REGION_CHIEF | DISTRICT_MANAGER
Item           ReceptionItem   Reception    Entity (SUPPLIER / BENEFICIARY)
Item           DistributionItem  Distribution  Entity + Employee
Entity         Employee[]
Entity         Vehicle[]
Budget         Expense[] + SupplyRequest[]
Distribution   DeliveryReceipt (وصولة تسليم)
User / Reception / Distribution  Log (سجل التدقيق)
```

### Row-Level Security

كل مستخدم يرى تلقائياً **فقط بيانات وحدته الأمنية** (`securityUnit`) عبر Prisma Query Extension المبني على AsyncLocalStorage.

الأدوار غير المقيّدة (ترى جميع البيانات):
- `ADMIN`  `REGION_CHIEF`  `DISTRICT_MANAGER`

---

##  المساهمة

1. Fork هذا المستودع
2. أنشئ فرعاً لميزتك: `git checkout -b feature/amazing-feature`
3. Commit تغييراتك: `git commit -m 'feat: add amazing feature'`
4. Push للفرع: `git push origin feature/amazing-feature`
5. افتح Pull Request مع وصف تفصيلي

### معايير الكود

- استخدم TypeScript بشكل صارم في Backend و Frontend
- اتبع نمط RESTful في مسارات API
- أضف التحقق من المدخلات بـ Zod لكل endpoint جديد
- تأكد من عمل Row-Level Security للبيانات الحساسة

---

##  الرخصة

هذا المشروع مرخص تحت رخصة [MIT](LICENSE).

---

<div align="center">
  صُنع بـ  لخدمة الوحدات الأمنية
</div>