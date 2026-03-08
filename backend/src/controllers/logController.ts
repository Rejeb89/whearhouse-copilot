import { Request, Response } from 'express'
import * as logQueryService from '../services/logQueryService'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const { from, to, action, table: tbl, limit = '500', page = '1' } = req.query as Record<string, string>
    const result = await logQueryService.queryLogs({ from, to, action, table: tbl, limit, page }, getSU(req))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const stats = async (req: Request, res: Response) => {
  try {
    const { year } = req.query as Record<string, string>
    const data = await logQueryService.getLogStats(Number(year), getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const monthlyReport = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query as Record<string, string>
    const data = await logQueryService.getMonthlyReport(Number(year), Number(month), getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const meta = async (_req: Request, res: Response) => {
  try {
    const data = await logQueryService.getLogMeta()
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
