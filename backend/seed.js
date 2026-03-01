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
