import { Request, Response } from 'express'
import { listAuditLogs } from '../services/auditService'

export const list = async (_req: Request, res: Response) => {
  try {
    const logs = await listAuditLogs(300)
    res.json({ data: logs })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
