const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 بدء تعبئة البيانات التجريبية...')

  // ================== المستخدمون ==================
  console.log('📝 إضافة المستخدمين...')
  const pw = bcrypt.hashSync('admin123', 10)
  
  const users = []
  const userEmails = [
    { email: 'admin@gn.tn', name: 'مسؤول النظام', role: 'ADMIN' },
    { email: 'chief@example.com', name: 'رئيس القسم', role: 'SECTION_CHIEF' },
    { email: 'user1@example.com', name: 'علي أحمد', role: 'USER' },
    { email: 'user2@example.com', name: 'فاطمة محمود', role: 'USER' },
    { email: 'battalion@example.com', name: 'قائد الكتيبة', role: 'BATTALION_COMMANDER' },
    { email: 'region@example.com', name: 'رئيس المنطقة', role: 'REGION_CHIEF' },
    { email: 'manager@example.com', name: 'مدير المقاطعة', role: 'DISTRICT_MANAGER' }
  ]

  for (const userData of userEmails) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: pw,
        name: userData.name,
        role: userData.role,
        personalNumber: `EMP${Math.floor(Math.random() * 10000)}`,
        securityUnit: 'الوحدة الأمنية الأولى',
        region: 'منطقة الخرطوم'
      }
    })
    users.push(user)
    console.log(`  ✓ ${userData.name}`)
  }

  // ================== الجهات (Entities) ==================
  console.log('🏢 إضافة الجهات...')
  const entities = []
  const entityData = [
    { name: 'مخزن الخرطوم', type: 'SUPPLIER', phone: '0183456789', unitHead: 'أحمد علي' },
    { name: 'مركز الإغاثة', type: 'BENEFICIARY', phone: '0187654321', unitHead: 'فاطمة محمد' },
    { name: 'مستودع الشرقية', type: 'SUPPLIER', phone: '0193334444', unitHead: 'عمر إبراهيم' },
    { name: 'مركز الرعاية الصحية', type: 'BENEFICIARY', phone: '0195555555', unitHead: 'زينب عبدالله' },
    { name: 'قسم الإمدادات', type: 'SUPPLIER', phone: '0196666666', unitHead: 'محمود حسن' }
  ]

  for (const data of entityData) {
    const entity = await prisma.entity.create({
      data: {
        name: data.name,
        type: data.type,
        category: 'DEFAULT',
        phone: data.phone,
        unitHead: data.unitHead,
        unitHeadPhone: data.phone,
        securityUnit: 'الوحدة الأمنية الأولى'
      }
    })
    entities.push(entity)
    console.log(`  ✓ ${data.name}`)
  }

  // ================== الموظفون ==================
  console.log('👥 إضافة الموظفين...')
  const employees = []
  for (let i = 0; i < entities.length; i++) {
    for (let j = 0; j < 3; j++) {
      const employee = await prisma.employee.create({
        data: {
          entityId: entities[i].id,
          rank: ['رقيب', 'جندي', 'عريف'][j],
          name: ['محمد', 'علي', 'أحمد'][j],
          surname: ['الشرقاوي', 'السلامي', 'البحراوي'][j],
          number: `EMP${entities[i].id}${j}${Date.now()}`.substring(0, 10),
          phone: `0191111${1000 + i * 10 + j}`
        }
      })
      employees.push(employee)
    }
  }
  console.log(`  ✓ تم إضافة ${employees.length} موظفين`)

  // ================== التجهيزات والمعدات ==================
  console.log('🛠️ إضافة التجهيزات والمعدات...')
  const items = []
  const itemData = [
    { name: 'خيم إنقاذ', sku: 'TENT-001', category: 'معدات إنقاذ' },
    { name: 'حقائب طبية', sku: 'MED-001', category: 'طبي' },
    { name: 'دواء أمينوفيلين', sku: 'DRUG-001', category: 'أدوية' },
    { name: 'أجهزة قياس ضغط', sku: 'MED-002', category: 'طبي' },
    { name: 'بطانيات إنقاذ', sku: 'BLA-001', category: 'معدات إنقاذ' },
    { name: 'حبال إنقاذ', sku: 'ROPE-001', category: 'معدات إنقاذ' },
    { name: 'خصم الملح', sku: 'SALT-001', category: 'طبي' },
    { name: 'معقمات', sku: 'DISINFECT-001', category: 'طبي' },
    { name: 'كمامات N95', sku: 'MASK-001', category: 'مستهلكات طبية' },
    { name: 'قفازات طبية', sku: 'GLOVE-001', category: 'مستهلكات طبية' }
  ]

  for (const data of itemData) {
    const item = await prisma.item.upsert({
      where: { sku: data.sku },
      update: {},
      create: {
        name: data.name,
        sku: data.sku,
        category: data.category,
        description: `تجهيزة ${data.name}`,
        quantity: 0,
        lowStockThreshold: 5,
        securityUnit: 'الوحدة الأمنية الأولى'
      }
    })
    items.push(item)
    console.log(`  ✓ ${data.name}`)
  }

  // ================== الوسائل (Vehicles) ==================
  console.log('🚐 إضافة الوسائل...')
  const vehicles = []
  const vehicleData = [
    { adminNumber: 'VH-001', vehicleType: 'غزوال بيك آب', type: 'وسيلة نقل', fuelType: 'غزوال', fuelQuota: 50 },
    { adminNumber: 'VH-002', vehicleType: 'سيارة سيدان', type: 'وسيلة نقل إدارية', fuelType: 'بنزين رفيع', fuelQuota: 30 },
    { adminNumber: 'VH-003', vehicleType: 'شاحنة نقل', type: 'وسيلة نقل ثقيلة', fuelType: 'غزوال', fuelQuota: 80 },
    { adminNumber: 'VH-004', vehicleType: 'دراجة نارية', type: 'وسيلة نقل خفيفة', fuelType: 'بنزين رفيع', fuelQuota: 10 },
    { adminNumber: 'VH-005', vehicleType: 'سيارة إسعاف', type: 'مركبة طبية', fuelType: 'بنزين رفيع', fuelQuota: 40 }
  ]

  for (const data of vehicleData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { adminNumber: data.adminNumber },
      update: {},
      create: {
        adminNumber: data.adminNumber,
        vehicleType: data.vehicleType,
        type: data.type,
        fuelType: data.fuelType,
        fuelQuota: data.fuelQuota,
        status: 'OPERATIONAL',
        entityId: entities[0].id,
        securityUnit: 'الوحدة الأمنية الأولى'
      }
    })
    vehicles.push(vehicle)
    console.log(`  ✓ ${data.vehicleType} (${data.adminNumber})`)
  }

  // ================== أسعار الوقود ==================
  console.log('⛽ إضافة أسعار الوقود...')
  const fuelPrices = [
    { fuelType: 'بنزين رفيع', pricePerLiter: 450 },
    { fuelType: 'غزوال', pricePerLiter: 400 }
  ]

  for (const data of fuelPrices) {
    await prisma.fuelPrice.upsert({
      where: { fuelType: data.fuelType },
      update: { pricePerLiter: data.pricePerLiter },
      create: data
    })
    console.log(`  ✓ ${data.fuelType}: ${data.pricePerLiter} دينار/لتر`)
  }

  // ================== عمليات الاستقبال (Receptions) ==================
  console.log('📥 إضافة عمليات الاستقبال (الدخول)...')
  const receptions = []
  
  for (let i = 0; i < 5; i++) {
    const reference = `RCP-${Date.now()}-${i}`
    const reception = await prisma.reception.upsert({
      where: { reference },
      update: {},
      create: {
        reference,
        referenceNumber: `FAC-${1001 + i}`,
        referenceType: 'فاتورة',
        referenceDate: new Date(2024, 0, 15 + i),
        notes: `استقبال تجهيزات من ${entities[0].name}`,
        supplierId: entities[0].id,
        collectorId: employees[0].id,
        userId: users[0].id,
        securityUnit: 'الوحدة الأمنية الأولى',
        items: {
          create: [
            { itemId: items[0].id, quantity: 10, adminNumber: `AD-${1001 + i}` },
            { itemId: items[1].id, quantity: 20, adminNumber: `AD-${2001 + i}` }
          ]
        }
      },
      include: { items: true }
    })
    receptions.push(reception)
    
    // تحديث جرد التجهيزات
    await prisma.item.update({
      where: { id: items[0].id },
      data: { quantity: { increment: 10 } }
    })
    await prisma.item.update({
      where: { id: items[1].id },
      data: { quantity: { increment: 20 } }
    })
    
    console.log(`  ✓ استقبال #${i + 1}: ${reception.referenceNumber}`)
  }

  // ================== عمليات التوزيع (Distributions) ==================
  console.log('📤 إضافة عمليات التوزيع (الخروج)...')
  const distributions = []
  
  for (let i = 0; i < 3; i++) {
    const reference = `DIST-${Date.now()}-${i}`
    const distribution = await prisma.distribution.upsert({
      where: { reference },
      update: {},
      create: {
        reference,
        referenceNumber: `REQ-${501 + i}`,
        referenceType: 'طلب توزيع',
        referenceDate: new Date(2024, 1, 10 + i),
        deliveredByName: employees[0].name,
        notes: `توزيع تجهيزات إلى ${entities[1].name}`,
        beneficiaryId: entities[1].id,
        assignedToId: employees[1].id,
        userId: users[1].id,
        securityUnit: 'الوحدة الأمنية الأولى',
        items: {
          create: [
            { itemId: items[0].id, quantity: 5, condition: 'NEW' },
            { itemId: items[1].id, quantity: 10, condition: 'NEW' }
          ]
        }
      },
      include: { items: true }
    })
    distributions.push(distribution)
    
    // تحديث جرد التجهيزات
    await prisma.item.update({
      where: { id: items[0].id },
      data: { quantity: { decrement: 5 } }
    })
    await prisma.item.update({
      where: { id: items[1].id },
      data: { quantity: { decrement: 10 } }
    })
    
    console.log(`  ✓ توزيع #${i + 1}: ${distribution.referenceNumber}`)
  }

  // ================== الموازنات ==================
  console.log('💰 إضافة الموازنات...')
  const budgets = [
    { name: 'موازنة الإمدادات الطبية', department: 'الشؤون الطبية', amount: 50000, startDate: '2024-01-01', endDate: '2024-12-31', status: 'active' },
    { name: 'موازنة الوقود', department: 'النقل', amount: 100000, startDate: '2024-01-01', endDate: '2024-12-31', status: 'active' },
    { name: 'موازنة الإنقاذ', department: 'الإنقاذ', amount: 75000, startDate: '2024-01-01', endDate: '2024-06-30', status: 'expired' }
  ]

  for (const data of budgets) {
    const budget = await prisma.budget.create({
      data: {
        ...data,
        securityUnit: 'الوحدة الأمنية الأولى',
        createdBy: users[0].name
      }
    })
    
    // إضافة مصاريف للموازنة
    const expenses = [
      { date: (new Date(2024, 0, 5)).toISOString().split('T')[0], supplier: 'مورد 1', amount: 5000 },
      { date: (new Date(2024, 0, 15)).toISOString().split('T')[0], supplier: 'مورد 2', amount: 8000 },
      { date: (new Date(2024, 1, 1)).toISOString().split('T')[0], supplier: 'مورد 3', amount: 6000 }
    ]
    
    for (const expense of expenses) {
      await prisma.budgetExpense.create({
        data: {
          budgetId: budget.id,
          ...expense,
          invoiceNumber: `INV-${Date.now()}`
        }
      })
    }
    
    console.log(`  ✓ ${data.name}`)
  }

  // ================== المشاريع ==================
  console.log('🏗️ إضافة المشاريع...')
  const projects = [
    { name: 'مشروع بناء المركز الصحي', type: 'CONSTRUCTION', status: 'WORK', budget: 500000, budgetYear: 2024, progress: 45 },
    { name: 'مشروع تطوير خدمات الإسعاف', type: 'DEVELOPMENT', status: 'STUDY', budget: 300000, budgetYear: 2024, progress: 10 },
    { name: 'مشروع حماية المنشآت', type: 'PROTECTION', status: 'WORK', budget: 400000, budgetYear: 2024, progress: 60 },
    { name: 'مشروع إعادة بناء المعسكر', type: 'CONSTRUCTION', status: 'COMPLETED', budget: 700000, budgetYear: 2023, progress: 100 }
  ]

  for (const data of projects) {
    const project = await prisma.project.create({
      data: {
        ...data,
        entityId: entities[0].id,
        startDate: new Date(2024, 0, 1),
        expectedEndDate: new Date(2024, 11, 31),
        securityUnit: 'الوحدة الأمنية الأولى'
      }
    })
    console.log(`  ✓ ${data.name}`)
  }

  // ================== سجلات الوقود ==================
  console.log('⛽ إضافة سجلات الوقود...')
  for (const vehicle of vehicles) {
    for (let month = 1; month <= 3; month++) {
      const fuelRecord = await prisma.fuelRecord.create({
        data: {
          vehicleId: vehicle.id,
          month,
          year: 2024,
          monthlyQuotaLiters: vehicle.fuelQuota || 50,
          deliveredAmount: (vehicle.fuelQuota || 50) * 400,
          additionalAmount: 0,
          consumedAmount: ((vehicle.fuelQuota || 50) * 0.8) * 400,
          startMileage: 10000 + month * 500,
          endMileage: 10000 + month * 500 + 1200,
          notes: `سجل الوقود لشهر ${month}/2024`
        }
      })
    }
    console.log(`  ✓ سجلات الوقود للمركبة ${vehicle.vehicleType}`)
  }

  console.log('\n✅ تم إكمال تعبئة البيانات التجريبية بنجاح!')
  console.log('📊 الإحصائيات:')
  console.log(`  - المستخدمون: ${users.length}`)
  console.log(`  - الجهات: ${entities.length}`)
  console.log(`  - الموظفون: ${employees.length}`)
  console.log(`  - التجهيزات: ${items.length}`)
  console.log(`  - الوسائل: ${vehicles.length}`)
  console.log(`  - عمليات الاستقبال: ${receptions.length}`)
  console.log(`  - عمليات التوزيع: ${distributions.length}`)
  console.log(`  - الموازنات: ${budgets.length}`)
  console.log(`  - المشاريع: ${projects.length}`)
}

main()
  .catch((e) => {
    console.error('❌ خطأ أثناء التعبئة:', e)
    // Do not exit with code 1 — allow the server to start even if seeding fails
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
