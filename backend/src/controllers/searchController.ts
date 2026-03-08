import { Request, Response } from 'express'
import { globalSearch } from '../services/searchService'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const search = async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim().toLowerCase()

  if (!q || q.length < 2) {
    return res.json({ data: { items: [], receptions: [], distributions: [], entities: [], employees: [], users: [] } })
  }

  try {
    const data = await globalSearch(q, getSU(req))
    res.json({ data })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
