import { Request, Response } from 'express'
import { globalSearch } from '../services/searchService'

export const search = async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim().toLowerCase()

  if (!q || q.length < 2) {
    return res.json({ data: { items: [], receptions: [], distributions: [], entities: [], employees: [], users: [] } })
  }

  try {
    const data = await globalSearch(q)
    res.json({ data })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
