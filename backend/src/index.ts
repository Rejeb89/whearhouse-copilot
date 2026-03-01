import app from './app'
import { PORT } from './config'
import prisma from './config/database'

const start = async () => {
  await prisma.$connect()
  app.listen(PORT, () => console.log(`Backend listening on ${PORT}`))
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
