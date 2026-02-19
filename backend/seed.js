const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const pw = bcrypt.hashSync('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', password: pw, name: 'Admin', role: 'ADMIN' }
  })
  console.log('Admin created:', admin.email)

  const items = [
    { name: 'Widget A', sku: 'WIDGET-A', description: 'Sample widget A', quantity: 50 },
    { name: 'Widget B', sku: 'WIDGET-B', description: 'Sample widget B', quantity: 3, lowStockThreshold: 5 }
  ]

  for (const it of items) {
    const i = await prisma.item.upsert({ where: { sku: it.sku }, update: {}, create: it })
    console.log('Item upserted', i.sku)
  }

  // create sample reception
  const reception = await prisma.reception.create({ data: { reference: `RCPT-${Date.now()}`, userId: admin.id } })
  await prisma.receptionItem.create({ data: { receptionId: reception.id, itemId: 1, quantity: 10 } })
  console.log('Sample reception created')

  // create sample distribution
  const distribution = await prisma.distribution.create({ data: { reference: `DIST-${Date.now()}`, userId: admin.id } })
  await prisma.distributionItem.create({ data: { distributionId: distribution.id, itemId: 1, quantity: 2 } })
  console.log('Sample distribution created')

  console.log('Seeding complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
