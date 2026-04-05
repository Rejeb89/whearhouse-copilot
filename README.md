<div align="center">

# 🏢 Warehouse-Copilot: نظام إدارة المخزن الأمني

### Security Warehouse Management System

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

**نظام متكامل لإدارة المخزن والتجهيزات للوحدات الأمنية**

يوفر لوحة تحكم مركزية متقدمة مع:
- دعم كامل للغة العربية وواجهة RTL احترافية
- نظام تحكم وصول متقدم يعتمد على 6 أدوار
- Row-Level Security للبيانات الحساسة
- تقارير متقدمة وتصدير إلى PDF و Excel
- سجلات تدقيق شاملة

</div>

---

## 🚀 ابدأ الآن

### التشغيل السريع مع Docker (30 ثانية)

```bash
git clone <repository-url>
cd whearhouse-copilot
docker compose up --build
```

**ثم افتح:** http://localhost:3002

**بيانات دخول:**
- البريد: `admin@gn.tn`
- كلمة المرور: `admin123`

---

## 📋 جدول المحتويات

- [🎯 المميزات الرئيسية](#-المميزات-الرئيسية)
- [⚙️ المكدس التقني](#-المكدس-التقني)
- [👥 الأدوار والصلاحيات](#-الأدوار-والصلاحيات)
- [📖 البدء السريع](#-البدء-السريع)
- [🔐 الأمان](#-الأمان)
- [📚 التوثيق](#-التوثيق)
- [❓ استكشاف الأخطاء](#-استكشاف-الأخطاء)
- [📞 الدعم والمساهمة](#-الدعم-والمساهمة)

---

## 🎯 المميزات الرئيسية

### 📦 إدارة المخزون
- تتبع شامل للأصناف والتجهيزات
- تنبيهات أوتوماتيكية للأصناف الناقصة
- عمليات استقبال وتوزيع محسّنة
- سجل كامل لحركة المخزون

### 🚗 إدارة المركبات
- تسجيل وتتبع المركبات الإدارية
- تسجيل استهلاك الوقود اليومي
- تقارير الكفاءة وتحليل الاستهلاك
- متابعة حالة الصيانة

### 🏢 إدارة الجهات
- إدارة الموردين والجهات المستفيدة
- إدارة الموظفين بكل جهة
- تسجيل بيانات التواصل الكاملة
- تقارير شاملة لكل جهة

### 💰 إدارة الميزانيات
- تخصيص الميزانيات بالأقسام
- تتبع النفقات والمصروفات
- تنبيهات عند تجاوز الميزانية
- تقارير مالية مفصلة

### 📋 وصالات التسليم
- إنشاء وصالات رقمية مع QR codes
- سهولة الطباعة والتوقيع
- تتبع حالة الوصالات
- أرشفة شاملة

### 📊 لوحات المراقبة
- لوحة مركزية للمسؤولين
- إحصائيات حية بالوقت الفعلي
- رسوم بيانية تفاعلية
- صلاحيات مخصصة حسب الدور

### 🔐 نظام الأمان
- 6 أدوار مع صلاحيات محددة
- Row-Level Security على قاعدة البيانات
- المصادقة عبر JWT
- تشفير كلمات المرور مع bcryptjs

### 📝 سجلات التدقيق
- تسجيل شامل لكل العمليات
- بحث متقدم وفلترة
- واجهة بصرية فعالة
- تصدير التقارير

---

## ⚙️ المكدس التقني

### Frontend
| التقنية | الغرض |
|---------|-------|
| React 18 | مكتبة UI |
| TypeScript | Type safety |
| Vite | بناء سريع |
| Tailwind CSS | تصميم احترافي |
| TanStack Query | إدارة الحالة |
| Recharts + Visx | الرسوم البيانية |
| jsPDF + xlsx | التصدير |

### Backend
| التقنية | الغرض |
|---------|-------|
| Node.js 18+ | بيئة التشغيل |
| Express | إطار عمل الويب |
| TypeScript | Type safety |
| Prisma ORM | الوصول لقاعدة البيانات |
| PostgreSQL 15 | قاعدة البيانات |
| JWT | المصادقة |
| Zod | التحقق من البيانات |

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 15-alpine
- Node 18-bullseye

---

## 👥 الأدوار والصلاحيات

| الدور | الوصول | الصلاحيات |
|------|--------|----------|
| **ADMIN** ⚙️ | الكل | إنشاء، تعديل، حذف، لوحة تحكم |
| **SECTION_CHIEF** 👨‍💼 | وحدتها | إنشاء، تعديل، حذف على وحدتها |
| **USER** 👤 | وحدتها | إنشاء، عرض فقط على وحدتها |
| **REGION_CHIEF** 🎖️ | المنطقة | عرض فقط - قراءة فقط |
| **BATTALION_COMMANDER** 🎯 | الكتيبة | عرض فقط - قراءة فقط |
| **DISTRICT_MANAGER** 📊 | المقاطعة | عرض فقط - قراءة فقط |

---

## 📖 البدء السريع

### المتطلبات
- Docker 24+
- Docker Compose v2+
- (أو Node.js 18+ و PostgreSQL 15+ للتطوير يدوياً)

### مع Docker (الموصى به)

#### 1. استنساخ وتشغيل
```bash
git clone <repository-url>
cd whearhouse-copilot
docker compose up --build
```

#### 2. انتظر 15-20 ثانية ثم افتح
- **الواجهة:** http://localhost:3002
- **API:** http://localhost:4000
- **قاعدة البيانات:** localhost:5434

#### 3. بيانات الدخول
```
البريد: admin@gn.tn
كلمة المرور: admin123
```

### بدون Docker (للتطوير)

#### Backend
```bash
cd backend
npm install
npx prisma db push
node seed.js
npm run dev
# http://localhost:4000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### أوامر مفيدة

```bash
# إيقاف جميع الحاويات
docker compose down

# حذف البيانات وإعادة تشغيل
docker compose down -v
docker compose up -d

# عرض السجلات
docker compose logs -f backend
docker compose logs -f frontend

# الدخول للـ shell
docker compose exec backend sh
docker compose exec postgres psql -U postgres
```

---

## 🔐 الأمان

### ✅ التدابير المطبقة

- **JWT Tokens** - 8 ساعات، توقيع آمن
- **bcryptjs** - تشفير كلمات المرور (10 جولات)
- **Row-Level Security** - تصفية تلقائية للبيانات
- **CORS مقيد** - توأمن معارضة الأصل
- **Input Validation** - تحقق من جميع المدخلات مع Zod
- **Hardened Docker** - شبكة معزولة، موارد محدودة
- **بدون بيانات حساسة** - كل شيء عبر .env
- **Audit Logging** - تسجيل كل العمليات

### 🔒 متغيرات البيئة المهمة

```env
# قاعدة البيانات
POSTGRES_PASSWORD=<strong_password>
APP_DB_PASSWORD=<strong_password>

# JWT
JWT_SECRET=<32_character_key>

# الدخول الأول (اختياري)
INITIAL_ADMIN_EMAIL=admin@gn.tn
INITIAL_ADMIN_PASSWORD=admin123

# CORS
ALLOWED_ORIGINS=http://localhost:3002,http://localhost:3000

# البيئة
NODE_ENV=development
```

> ⚠️ **تحذير:** غير جميع الكلمات السرية المهمة في الإنتاج!

---

## 📚 التوثيق

للتوثيق التقني الشامل، راجع:

- **[DOCUMENTATION.md](DOCUMENTATION.md)** - التوثيق الكامل للنظام
  - بنية الـ Frontend (17 صفحة)
  - بنية الـ Backend (17 خدمة)
  - Schema قاعدة البيانات (17 جدول)
  - مراجع API الكاملة (80+ endpoint)
  - خطط البيانات والتدفقات

- **[SECURITY.md](SECURITY.md)** - التفاصيل الأمنية
  - ملخص التدابير الأمنية
  - قائمة تدقيق الأمان
  - الثغرات المعروفة والإصلاحات

- **[SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)** - تقرير الأمان الشامل
  - 22 ثغرة تم تحديدها
  - 4 ثغرات حرجة تم إصلاحها
  - توصيات تفصيلية

---

## ❓ استكشاف الأخطاء

### المشكلة: "Cannot connect to database"
```bash
# تحقق من حالة الحاويات
docker compose ps

# أعد تشغيل PostgreSQL
docker compose restart postgres

# تحقق من السجلات
docker compose logs postgres
```

### المشكلة: Frontend لا يتصل بـ Backend
```bash
# تحقق من VITE_API_URL في .env
# يجب أن تكون: http://localhost:4000

# أعد بناء Frontend
docker compose restart frontend

# أو بدون Docker:
cd frontend
npm install
npm run dev
```

### المشكلة: "Authentication failed"
```bash
# تحقق من بيانات الدخول:
# البريد: admin@gn.tn
# كلمة المرور: admin123

# أعد تشغيل:
docker compose restart backend
```

### عرض السجلات للتصحيح
```bash
# جميع السجلات
docker compose logs

# Backend فقط
docker compose logs backend -f

# Frontend فقط
docker compose logs frontend -f

# البحث عن أخطاء
docker compose logs | grep ERROR
```

---

## 📞 الدعم والمساهمة

### المساهمة في المشروع

1. **انسخ المستودع** (Fork)
2. **أنشئ فرع ميزة** (`git checkout -b feature/amazing-feature`)
3. **أضف التغييرات** (`git commit -m 'feat: add feature'`)
4. **أرسل للفرع** (`git push origin feature/amazing-feature`)
5. **افتح Pull Request**

### الإبلاغ عن الأخطاء

استخدم **GitHub Issues** مع:
- وصف مفصل للمشكلة
- خطوات لإعادة الإنتاج
- رسائل الخطأ الكاملة
- البيئة المستخدمة

### طلب ميزات جديدة

افتح **Discussion** أو **Issue** مع:
- الحالة الحالية
- الحل المطلوب
- حالات الاستخدام المحتملة

---

## 📁 هيكل المشروع

```
whearhouse-copilot/
├── backend/              # Node.js + Express + Prisma
│   ├── src/
│   │   ├── controllers/  # معالجات HTTP (17)
│   │   ├── services/     # العمليات (17)
│   │   ├── routes/       # المسارات (18+)
│   │   ├── middleware/   # الحماية والتدقيق
│   │   ├── validation/   # التحقق (Zod)
│   │   └── utils/        # دوال مساعدة
│   └── prisma/          # نموذج قاعدة البيانات
│
├── frontend/             # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/       # 17 صفحة رئيسية
│   │   ├── components/  # 50+ مكون قابل لإعادة الاستخدام
│   │   ├── services/    # عملاء API
│   │   ├── context/     # إدارة الحالة
│   │   └── utils/       # دوال مساعدة
│   └── index.html
│
├── docker-compose.yml    # التركيب متعدد الحاويات
├── .env.example          # نموذج الإعدادات
├── DOCUMENTATION.md      # التوثيق الكامل
└── README.md            # هذا الملف
```

---

## 📊 الإحصائيات

- **17** صفحة أمامية
- **17** خدمة خلفية
- **18+** مسار API
- **7** middleware للأمان
- **17** جدول في قاعدة البيانات
- **6** أدوار مختلفة
- **100% عربي** - دعم كامل للغة العربية

---

## 📄 الترخيص

هذا المشروع مرخص بموجب **[MIT License](LICENSE)**

يمكنك استخدام، تعديل، ونشر المشروع بحرية مع الإشارة للمصدر.

---

<div align="center">

## 🙏 شكر خاص

تم إنشاء هذا النظام بعناية فائقة لخدمة الوحدات الأمنية

**إذا وجدت البرنامج مفيداً:**
- ⭐ أضف نجمة للمستودع
- 💬 شارك الملاحظات والاقتراحات
- 🐛 أبلِغ عن الأخطاء إذا واجهت أي مشاكل

---

**الإصدار:** 2.0.0 | **آخر تحديث:** 2026-04-05 | **الحالة:** ✅ منتج

</div>