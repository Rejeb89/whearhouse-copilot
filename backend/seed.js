const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 بدء تعبئة البيانات...')

  // ================== المستخدمون ==================
  console.log('📝 إضافة المسؤول...')
  const pw = bcrypt.hashSync('admin123', 10)
  
  const users = []
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gn.tn' },
    update: {},
    create: {
      email: 'admin@gn.tn',
      password: pw,
      name: 'مسؤول النظام',
      role: 'ADMIN',
      personalNumber: 'ADMIN001',
      securityUnit: 'الادارة العامة للحرس الوطني',
      region: 'العوينة تونسي'
    }
  })
  users.push(adminUser)
  console.log(`  ✓ مسؤول النظام`)

  console.log('\n✅ تم إكمال تعبئة البيانات بنجاح!')
  console.log('📊 الإحصائيات:')
  console.log(`  - المستخدمون: ${users.length}`)
  console.log(`  - البريد الإلكتروني: admin@gn.tn`)
  console.log(`  - كلمة المرور: admin123`)
}

main()
  .catch((e) => {
    console.error('❌ خطأ أثناء التعبئة:', e)
    // Do not exit with code 1 — allow the server to start even if seeding fails
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
