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
import auditRoutes from './routes/audit'
import dataRoutes from './routes/data'
import searchRoutes from './routes/search'
import budgetsRoutes from './routes/budgets'
import receiptsRoutes from './routes/receipts'
import prisma from './prisma'

const app = express()
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/receptions', receptionsRoutes)
app.use('/api/distributions', distributionsRoutes)
app.use('/api/logs', logsRoutes)
app.use('/api/entities', entitiesRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/budgets', budgetsRoutes)
app.use('/api/receipts', receiptsRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

// Global error handler – returns JSON so the frontend always sees a structured error
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[ERROR]', err?.message ?? err)
  res.status(err?.status ?? 500).json({ error: err?.message ?? 'Internal Server Error' })
})

const start = async () => {
  await prisma.$connect()
  app.listen(PORT, () => console.log(`Backend listening on ${PORT}`))
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
