import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { requestLogger } from './middleware/requestLogger'
import { errorHandler } from './middleware/errorHandler'
import { securityUnitContext } from './middleware/securityUnitContext'
import apiRoutes from './routes'

const app = express()

// Global middleware
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use(requestLogger)
// Decode JWT (if present) and store securityUnit in AsyncLocalStorage so the
// Prisma query extension can automatically scope every DB query to the right unit.
app.use(securityUnitContext)

// API routes
app.use('/api', apiRoutes)

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Global error handler
app.use(errorHandler)

export default app
