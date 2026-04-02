import app from './app'
import { PORT } from './config'
import prisma from './config/database'
import { setupDatabase } from './utils/setupDatabase'
import bcrypt from 'bcryptjs'

const ensureDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@example.com'
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      const hashedPassword = bcrypt.hashSync('password123', 10)
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'مسؤول النظام',
          role: 'ADMIN',
          personalNumber: 'ADMIN001'
        }
      })
      console.log('✅ Created default admin user: admin@example.com')
    } else {
      console.log('✅ Admin user already exists')
    }
  } catch (error) {
    console.error('⚠️  Error ensuring default admin:', error)
  }
}

const start = async () => {
  // Apply Row-Level Security policies and provision app_user (idempotent)
  await setupDatabase()
  await prisma.$connect()
  
  // Ensure default admin user exists
  await ensureDefaultAdmin()
  
  app.listen(PORT, () => console.log(`Backend listening on ${PORT}`))
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
