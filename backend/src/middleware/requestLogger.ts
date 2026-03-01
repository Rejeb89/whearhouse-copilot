import { Request, Response, NextFunction } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    if (res.statusCode >= 400) {
      console.error(`[${res.statusCode}] ${req.method} ${req.originalUrl} (${ms}ms)`)
    } else {
      console.log(`[${res.statusCode}] ${req.method} ${req.originalUrl} (${ms}ms)`)
    }
  })
  next()
}
