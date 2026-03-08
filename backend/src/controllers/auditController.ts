import { Request, Response } from 'express'
import { listAuditLogs } from '../services/auditService'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const logs = await listAuditLogs(300, getSU(req))
    res.json({ data: logs })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
