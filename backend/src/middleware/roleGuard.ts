import { Request, Response, NextFunction } from 'express'

export const roleGuard = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' })
  next()
}
