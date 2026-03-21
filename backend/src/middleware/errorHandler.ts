import { Request, Response, NextFunction } from 'express'

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err?.message ?? err)
  const status = err?.status ?? 500
  // Only expose error messages for client errors, not for server errors
  const message = status < 500 ? (err?.message ?? 'خطأ في الطلب') : 'حدث خطأ داخلي في الخادم'
  res.status(status).json({ error: message })
}
