import { Request, Response, NextFunction } from 'express'
import prisma from '../config/database'

/* Roles allowed to access the monitoring dashboard */
export const MONITORING_ROLES = ['ADMIN', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']

/* Guard: only monitoring roles may proceed */
export const monitoringRoleGuard = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  if (!MONITORING_ROLES.includes(user.role)) return res.status(403).json({ error: 'Forbidden' })
  next()
}

/**
 * Guard for routes that operate on a specific :unit.
 * - ADMIN       → unrestricted
 * - REGION_CHIEF → only their own securityUnit
 * - DISTRICT_MANAGER → units where at least one user shares the same region
 */
export const unitAccessGuard = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user
  const unit = decodeURIComponent(req.params.unit)

  if (user.role === 'ADMIN') return next()

  if (user.role === 'REGION_CHIEF' || user.role === 'BATTALION_COMMANDER') {
    if (user.securityUnit === unit) return next()
    return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذه الوحدة' })
  }

  if (user.role === 'DISTRICT_MANAGER') {
    const match = await prisma.user.findFirst({
      where: { securityUnit: unit, region: user.region },
    })
    if (match) return next()
    return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذه الوحدة' })
  }

  return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذه الوحدة' })
}
