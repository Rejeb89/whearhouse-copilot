import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { requestLogger } from './middleware/requestLogger'
import { errorHandler } from './middleware/errorHandler'
import { securityUnitContext } from './middleware/securityUnitContext'
import apiRoutes from './routes'

const app = express()

// CORS Configuration: Only allow whitelisted origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3002').split(',')

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Check if origin is allowed
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }
    
    // Reject origin not in whitelist
    callback(new Error(`CORS not allowed for origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
}))
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))
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
