import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { PORT } from './config'
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import itemsRoutes from './routes/items'
import receptionsRoutes from './routes/receptions'
import distributionsRoutes from './routes/distributions'
import logsRoutes from './routes/logs'
import entitiesRoutes from './routes/entities'
import employeesRoutes from './routes/employees'
import prisma from './prisma'

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/receptions', receptionsRoutes)
app.use('/api/distributions', distributionsRoutes)
app.use('/api/logs', logsRoutes)
app.use('/api/entities', entitiesRoutes)
app.use('/api/employees', employeesRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

const start = async () => {
  await prisma.$connect()
  app.listen(PORT, () => console.log(`Backend listening on ${PORT}`))
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
