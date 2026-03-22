import dotenv from 'dotenv'

dotenv.config()

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export const JWT_SECRET = process.env.JWT_SECRET
export const DATABASE_URL = process.env.DATABASE_URL || ''
export const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || '5', 10)
export const PORT = parseInt(process.env.PORT || '4000', 10)
