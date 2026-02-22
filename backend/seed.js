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

  const upsertedItems = []
  for (const it of items) {
    const i = await prisma.item.upsert({ where: { sku: it.sku }, update: {}, create: it })
    upsertedItems.push(i)
    console.log('Item upserted', i.sku)
  }

  // create sample reception/distribution using real IDs (skip if any error)
  try {
    const firstItem = upsertedItems[0]
    if (firstItem) {
      const reception = await prisma.reception.create({ data: { reference: `RCPT-${Date.now()}`, userId: admin.id } })
      await prisma.receptionItem.create({ data: { receptionId: reception.id, itemId: firstItem.id, quantity: 10 } })
      console.log('Sample reception created')

      const distribution = await prisma.distribution.create({ data: { reference: `DIST-${Date.now()}`, userId: admin.id } })
      await prisma.distributionItem.create({ data: { distributionId: distribution.id, itemId: firstItem.id, quantity: 2 } })
      console.log('Sample distribution created')
    }
  } catch (e) {
    console.log('Sample data skipped (already exists or FK error):', e.message)
  }

  console.log('Seeding complete')
}

main()
  .catch((e) => {
    console.error(e)
    // Do not exit with code 1 — allow the server to start even if seeding fails
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
