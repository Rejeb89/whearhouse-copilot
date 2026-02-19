import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })
  const parts = auth.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'Unauthorized' })
  const token = parts[1]
  try {
    const decoded = verifyToken(token) as any
    req.user = decoded
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
