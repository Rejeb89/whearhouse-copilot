<div align="center">

# 🏢 نظام إدارة المخزن الأمني
### Security Warehouse Management System

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/RTL-Arabic-FFC400?style=for-the-badge" />
</p>

<p>
  نظام متكامل لإدارة المخزن والتجهيزات للوحدات الأمنية<br/>
  يتضمن لوحة تحكم مركزية متقدمة ونظام تحكم وصول يعتمد على الأدوار<br/>
  <strong>دعم كامل للغة العربية وواجهة RTL احترافية</strong>
</p>

</div>

---

## 📋 جدول المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [المميزات](#-المميزات)
- [المكدس التقني](#-المكدس-التقني)
- [الأدوار والصلاحيات](#-الأدوار-والصلاحيات)
- [المتطلبات الأساسية](#-المتطلبات-الأساسية)
- [البدء السريع مع Docker](#-البدء-السريع--docker)
- [الإعداد اليدوي للتطوير](#-الإعداد-اليدوي-للتطوير)
- [متغيرات البيئة](#-متغيرات-البيئة)
- [هيكل المشروع](#-هيكل-المشروع)
- [نظرة عامة على API](#-نظرة-عامة-على-api)
- [قاعدة البيانات](#-قاعدة-البيانات)
- [المساهمة](#-المساهمة)
- [الترخيص](#-الترخيص)

---

## 🎯 نظرة عامة

تطبيق ويب متكامل يعتمد على React + Express مع دعم كامل لللغة العربية (RTL)، يتيح للوحدات الأمنية إدارة:

- 📦 **المخزون والتجهيزات** - دخول يومي وخرج يومي مع تنبيهات الأصناف الناقصة
- 🚗 **المركبات الإدارية** - تسجيل وتتبع مركبات الوحدات الأمنية
- 🏢 **الجهات والموردين** - إدارة الجهات المرسلة (موردين) والجهات المستقبلة (مستفيدة) مع كشوفات الموظفين
- 💰 **الميزانيات والمصروفات** - متابعة الميزانيات والمصروفات وطلبات الإمدادات
- 📋 **وصالات التسليم** - إنشاء وطباعة وصالات رقمية مع رموز QR
- 📊 **لوحة المراقبة المركزية** - رؤية شاملة لجميع الوحدات مع إحصائيات حية
- 📈 **التقارير وتصدير البيانات** - دعم Excel و PDF لجميع الوحدات
- 🔐 **نظام الأدوار المتقدم** - 5 أدوار مع فصل كامل للصلاحيات
- 📝 **سجلات التدقيق** - تتبع دقيق لجميع العمليات مع واجهة بصرية متقدمة
- 🌍 **دعم RTL كامل** - واجهة عربية بنسبة 100% مع خط Cairo المحترف

---

## ⚙️ المكدس التقني

### الواجهة الأمامية (Frontend)
- **React 18** + **TypeScript** + **Vite** - بناء سريع وتطوير فعّال
- **Tailwind CSS** - تصميم القالب مع CSS Variables مخصصة
- **TanStack Query v4** - إدارة الحالة والـ caching
- **Recharts** + **Visx** - رسوم بيانية تفاعلية متقدمة
- **react-router-dom v6** - التوجيه من جانب العميل
- **jsPDF** + **html2canvas** + **xlsx** - تصدير التقارير

### الخادم الخلفي (Backend)
- **Node.js** + **Express** + **TypeScript** - API قوي وموثوق
- **Prisma ORM v5** - إدارة قاعدة البيانات بـ Type Safety
- **PostgreSQL 15** - قاعدة بيانات علائقية قوية
- **JWT** - المصادقة والترخيص الآمنة
- **Zod** - التحقق من صحة المدخلات
- **bcryptjs** - تشفير كلمات المرور

### البنية التحتية (Infrastructure)
- **Docker** + **Docker Compose** - حاويات موحدة وسهلة النشر
- **Row-Level Security** - تأمين البيانات عبر AsyncLocalStorage + Prisma Extension

---

## 👥 الأدوار والصلاحيات

| الدور | الوصول | الوصف |
|------|--------|-------|
| **ADMIN** ⚙️ | لوحة المراقبة + الإعدادات | مسؤول النظام - نطاق وصول عام |
| **SECTION_CHIEF** 👨‍💼 | وصول كامل | رئيس القسم - صلاحيات كاملة لوحدته الأمنية |
| **USER** 👤 | محدود | مستخدم عادي - قراءة وإنشاء فقط |
| **REGION_CHIEF** 🎖️ | عرض خاص بالوحدة | رئيس المنطقة - توجيه مباشر لوحدته (قراءة فقط) |
| **DISTRICT_MANAGER** 📊 | عرض جميع وحدات المقاطعة | مدير المقاطعة - عرض جميع وحدات المقاطعة (قراءة فقط) |

> **ملاحظة:** `REGION_CHIEF` و `DISTRICT_MANAGER` لديهم وصول **قراءة فقط** - لا توجد أزرار تعديل أو حذف

---

## 📋 المتطلبات الأساسية

| الأداة | الإصدار الأدنى |
|--------|----------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ |
| Node.js *(للتطوير فقط)* | 18+ |
| npm *(للتطوير فقط)* | 9+ |

---

## 🚀 البدء السريع مع Docker

أسرع طريقة لتشغيل المشروع بأكمله بأمر واحد:

```bash
git clone https://github.com/your-username/whearhouse-copilot.git
cd whearhouse-copilot
docker compose up --build
```

بعد انتهاء عملية الإنشاء:

| الخدمة | الـ URL |
|--------|--------|
| 🖥️ الواجهة الأمامية | http://localhost:3002 |
| 🔌 API الخادم | http://localhost:4000 |
| 🗄️ PostgreSQL | localhost:5434 |

### بيانات الدخول الافتراضية

لملء قاعدة البيانات ببيانات تجريبية:

```bash
docker compose exec backend node seed.js
```

| الدور | البريد الإلكتروني | كلمة المرور |
|------|------------------|-----------|
| **ADMIN** | admin@gn.tn | admin123 |

> **ملاحظة مهمة:** المسؤول **لا يضطر** لإدخال الإقليم أو اسم الوحدة الجهوية

---

## 🛠️ الإعداد اليدوي للتطوير

### 1. قاعدة البيانات

```bash
# تشغيل PostgreSQL فقط عبر Docker
docker compose up postgres -d
```

### 2. الخادم الخلفي

```bash
cd backend

# تثبيت المكتبات المطلوبة
npm install

# تطبيق المخطط على قاعدة البيانات
npx prisma db push

# توليد Prisma Client
npx prisma generate

# (اختياري) ملء البيانات التجريبية
node seed.js

# تشغيل خادم التطوير
npm run dev
```

> 🔗 الخادم سيكون متاحاً على: **http://localhost:4000**

### 3. الواجهة الأمامية

```bash
cd frontend

# تثبيت المكتبات المطلوبة
npm install

# تشغيل خادم التطوير
npm run dev
```

> 🔗 الواجهة ستكون متاحة على: **http://localhost:5173**

### 4. البناء للإنتاج

```bash
# الخادم الخلفي
cd backend
npm run build
npm start

# الواجهة الأمامية
cd frontend
npm run build
npm run preview
```

---

## 🔐 متغيرات البيئة

### `backend/.env`

```env
# اتصال قاعدة البيانات (Prisma)
DATABASE_URL=postgres://postgres:postgres@localhost:5434/warehouse

# مفتاح JWT السري - غيره في الإنتاج!
JWT_SECRET=supersecret_jwt_key_change_in_production

# حد التنبيه للأصناف الناقصة
LOW_STOCK_THRESHOLD=5

# منفذ الخادم (اختياري، الافتراضي 4000)
PORT=4000
```

### `frontend/.env`

```env
# عنوان API الخادم الخلفي
VITE_API_URL=http://localhost:4000
```

⚠️ **تحذير أمني:** لا تستخدم القيم الافتراضية في بيئة الإنتاج!

---

## 📦 هيكل المشروع

```
whearhouse-copilot/
  ├── docker-compose.yml
  ├── README.md
  │
  ├── database/
  │   └── init.sql
  │
  ├── backend/                              # Node.js + Express + Prisma
  │   ├── src/
  │   │   ├── index.ts                     # نقطة دخول الخادم
  │   │   ├── app.ts                       # إعداد Express والـ Middleware
  │   │   ├── config/                      # إعدادات قاعدة البيانات والثوابت
  │   │   ├── controllers/                 # معالجات HTTP لكل مورد
  │   │   ├── services/                    # طبقة المنطق التجاري
  │   │   ├── routes/                      # تعريفات مسارات API
  │   │   ├── middleware/
  │   │   │   ├── authGuard.ts            # التحقق من JWT
  │   │   │   ├── roleGuard.ts            # حماية الأدوار
  │   │   │   ├── securityUnitContext.ts  # Row-Level Security التلقائي
  │   │   │   └── requestLogger.ts        # تسجيل الطلبات للتدقيق
  │   │   ├── types/                       # تعريفات TypeScript المشتركة
  │   │   ├── utils/                       # دوال مساعدة (jwt, hash, errors)
  │   │   └── validation/                  # مخططات التحقق من Zod
  │   ├── prisma/
  │   │   └── schema.prisma                # تعريفات نموذج قاعدة البيانات
  │   ├── seed.js                          # ملء البيانات التجريبية
  │   └── package.json
  │
  └── frontend/                             # React + TypeScript + Vite
      ├── src/
      │   ├── App.tsx                       # التوجيه والحماية والتحقق من الأدوار
      │   ├── main.tsx
      │   ├── components/
      │   │   ├── common/                  # Layout, Sidebar, GlobalSearch
      │   │   ├── charts/                  # رسوم بيانية متقدمة
      │   │   ├── modals/                  # نوافذ إنشاء وتعديل البيانات
      │   │   └── receipts/                # قالب طباعة PDF مع رموز QR
      │   ├── context/
      │   │   └── AuthContext.tsx          # سياق المصادقة العام
      │   ├── hooks/                        # Hooks React مخصصة
      │   ├── pages/                        # جميع صفحات التطبيق
      │   ├── services/
      │   │   └── client.ts                # instance Axios مع معالجات JWT
      │   └── utils/                        # دوال مساعدة (تنسيق، تصدير...)
      ├── index.html
      └── package.json
```

---

## 🌐 نظرة عامة على API

جميع المسارات محمية بـ JWT وتبدأ بـ `/api`

| المسار | الطريقة | الوصف | المصادقة |
|--------|--------|-------|---------|
| `/auth/login` | `POST` | تسجيل الدخول وتلقي Token | عام |
| `/items` | `GET / POST` | قائمة والتجهيزات وإنشاء | authGuard |
| `/receptions` | `GET / POST` | عمليات الدخول اليومي | authGuard |
| `/distributions` | `GET / POST` | عمليات الخرج اليومي | authGuard |
| `/entities` | `GET / POST` | الجهات (موردين+مستقبلة) | authGuard |
| `/entities/:id` | `GET` | تفاصيل الجهة مع الموظفين | authGuard |
| `/vehicles` | `GET / POST / PATCH` | المركبات الإدارية | authGuard |
| `/employees/:entityId` | `GET / POST` | موظفو الجهة | authGuard |
| `/budgets` | `GET / POST` | الميزانيات المالية | authGuard |
| `/receipts` | `GET / POST` | وصالات التسليم | authGuard |
| `/users` | `GET` | قائمة المستخدمين | 4 أدوار |
| `/users/meta` | `GET` | البيانات الوصفية | 4 أدوار |
| `/audit` | `GET` | سجل التدقيق البصري | 4 أدوار |
| `/monitoring/units` | `GET` | ملخص إحصائي للوحدات | أدوار المراقبة |
| `/monitoring/units/:unit/*` | `GET` | بيانات تفصيلية للوحدة | أدوار المراقبة |
| `/data/stats` | `GET` | إحصائيات عامة للنظام | 4 أدوار |
| `/data/export` | `GET` | تصدير البيانات الكاملة | ADMIN / SECTION_CHIEF |
| `/search` | `GET` | بحث عام في جميع الجهات | authGuard |
| `/logs` | `GET` | سجلات العمليات | authGuard |

---

## 🗄️ قاعدة البيانات

### نماذج البيانات الأساسية

```
User              [الأدوار: ADMIN | SECTION_CHIEF | USER | REGION_CHIEF | DISTRICT_MANAGER]
Item              ←→ ReceptionItem ←→ Reception ←→ Entity (SUPPLIER / BENEFICIARY)
Item              ←→ DistributionItem ←→ Distribution ←→ Entity + Employee
Entity            ←→ Employee[]
Entity            ←→ Vehicle[]
Budget            ←→ Expense[] + SupplyRequest[]
Distribution      ←→ DeliveryReceipt
User / Reception / Distribution  ←→ Log (سجل التدقيق)
```

### Row-Level Security (أمان مستوى الصفوف)

كل مستخدم يرى **فقط بيانات وحدته الأمنية الخاصة** (`securityUnit`) عبر Prisma Query Extension المبني على AsyncLocalStorage.

**الأدوار غير المقيدة** (تشاهد جميع البيانات):
- `ADMIN` | `REGION_CHIEF` | `DISTRICT_MANAGER`

---

## 🎯 الميزات الخاصة والتحسينات

### 📊 لوحة التحكم (Dashboard)
- ✅ عرض الأصناف المنخفضة في الـ charts بذكاء
  - **يتم عرض فقط:** دفاتر إدارية + علم جمهورية + لفائف فاكس
  - **الحد الأقصى:** 10 تجهيزات فقط
  - **التحديث:** تحديث فوري لجميع المستخدمين

### 👤 إدارة المستخدمين
- ✅ المسؤول (ADMIN) **لا يضطر** لإدخال:
  - الإقليم
  - اسم الوحدة الجهوية
- ✅ بقية المستخدمين: **يجب** إدخال الإقليم

### 🎨 واجهة المستخدم
- ✅ إصلاح كامل لـ RTL direction
- ✅ أيقونات محاذاة صحيحة (أسهم وأزرار)
- ✅ عدم تداخل النصوص مع الأيقونات
- ✅ دعم كامل للغة العربية

---

## 📖 المساهمة

1. **Fork** هذا المستودع
2. أنشئ فرع ميزة: `git checkout -b feature/amazing-feature`
3. انشر تعديلاتك: `git commit -m 'feat: add amazing feature'`
4. أرسل إلى الفرع: `git push origin feature/amazing-feature`
5. افتح Pull Request مع وصف تفصيلي

### معايير الكود

- استخدام TypeScript الصارم في الخلف والأمام
- الامتثال لمعايير RESTful للمسارات
- إضافة التحقق من Zod لكل endpoint جديد
- ضمان احترام Row-Level Security للبيانات الحساسة
- اتباع معايير الكود الموحدة والتعليقات الواضحة

---

## 📄 الترخيص

هذا المشروع مرخص بموجب [MIT](LICENSE) License.

---

<div align="center">
  صُنع بـ ❤️ لخدمة الوحدات الأمنية
  <br/>
  <strong>آخر تحديث: أبريل 2026</strong>
</div>

##  API Overview

All routes are JWT-protected and prefixed with `/api`

| Route | Method | Description | Auth |
|-------|--------|-------------|------