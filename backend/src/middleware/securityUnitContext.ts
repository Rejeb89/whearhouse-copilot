import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { securityStorage } from '../config/securityContext'

/**
 * Reads the JWT from the Authorization header (if present) and stores the
 * user's securityUnit in AsyncLocalStorage so the Prisma query extension can
 * automatically apply row-level filters on every query without relying on
 * individual controllers to remember.
 *
 * Must be registered BEFORE route handlers in app.ts.
 */
export const securityUnitContext = (req: Request, res: Response, next: NextFunction): void => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    next()
    return
  }
  try {
    const token = auth.split(' ')[1]
    const decoded = verifyToken(token) as any
    // ADMIN, REGION_CHIEF, DISTRICT_MANAGER → null (no global filter)
    // Monitoring roles have their own per-request access guards.
    const UNRESTRICTED_ROLES = ['ADMIN', 'REGION_CHIEF', 'DISTRICT_MANAGER']
    const su: string | null = UNRESTRICTED_ROLES.includes(decoded.role) ? null : (decoded.securityUnit?.trim() || null)
    securityStorage.run(su, next)
  } catch {
    // Invalid / expired token — let authGuard handle the rejection
    next()
  }
}
