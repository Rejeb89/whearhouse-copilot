import app from './app'
import { PORT } from './config'
import prisma from './config/database'
import { setupDatabase } from './utils/setupDatabase'

const start = async () => {
  // Apply Row-Level Security policies and provision app_user (idempotent)
  await setupDatabase()
  await prisma.$connect()
  app.listen(PORT, () => console.log(`Backend listening on ${PORT}`))
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
