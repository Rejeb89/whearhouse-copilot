import { Request, Response } from 'express'
import * as dataService from '../services/dataService'

export const exportData = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user
    const payload = await dataService.exportData(actor?.email, actor?.id)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="warehouse-backup-${new Date().toISOString().slice(0, 10)}.json"`)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const importData = async (req: Request, res: Response) => {
  try {
    const { data, mode = 'merge' } = req.body as { data: any; mode: 'merge' | 'replace' }
    const actor = (req as any).user
    const result = await dataService.importData(data, mode, actor?.email, actor?.id)
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const clearData = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user
    const result = await dataService.clearData(actor?.email, actor?.id)
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const stats = async (_req: Request, res: Response) => {
  try {
    const data = await dataService.getDatabaseStats()
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
