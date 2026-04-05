import app from './app'
import { PORT } from './config'
import prisma from './config/database'
import { setupDatabase } from './utils/setupDatabase'
import bcrypt from 'bcryptjs'

const ensureDefaultAdmin = async () => {
  try {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD

    // Only create admin if environment variables are explicitly set
    if (!adminEmail || !adminPassword) {
      console.warn('⚠️  INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD not set - skipping admin creation')
      console.warn('💡 To create admin: set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in .env')
      return
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      const hashedPassword = bcrypt.hashSync(adminPassword, 10)
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrator',
          role: 'ADMIN',
          personalNumber: `ADMIN_${Date.now()}`
        }
      })
      console.log(`✅ Created admin user: ${adminEmail}`)
      console.warn('⚠️  IMPORTANT: Change the admin password immediately after first login!')
    } else {
      console.log(`✅ Admin user already exists: ${adminEmail}`)
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
