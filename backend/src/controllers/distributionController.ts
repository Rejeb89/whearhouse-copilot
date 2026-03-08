import { Request, Response } from 'express'
import * as distributionService from '../services/distributionService'
import { humanizePrismaError } from '../utils/prismaError'

const UNRESTRICTED_ROLES = ['ADMIN', 'REGION_CHIEF', 'DISTRICT_MANAGER']
const getSU = (req: Request) => {
  const u = (req as any).user
  return UNRESTRICTED_ROLES.includes(u?.role) ? undefined : (u?.securityUnit ?? undefined)
}

export const create = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const su = (req as any).user?.securityUnit
    const { items, beneficiaryId, assignedToId, notes, referenceType, referenceNumber, referenceDate, deliveredByName } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'يرجى إضافة تجهيز واحد على الأقل' })
    }

    const normalizedItems = items.map((it: any) => ({
      itemId: it.itemId,
      quantity: it.quantity,
      serialNumber: it.serialNumber,
      adminNumber: it.adminNumber,
      condition: it.condition,
      notes: it.notes,
    }))

    const reference = `DIST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const distribution = await distributionService.createDistribution(
      userId, reference, normalizedItems, beneficiaryId, assignedToId, notes,
      referenceType, referenceNumber, referenceDate, deliveredByName, su,
    )
    res.json({ data: distribution })
  } catch (err: any) {
    console.error('Distribution POST error:', err)
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    const { search, referenceType, dateFrom, dateTo } = req.query as Record<string, string>
    const data = await distributionService.getAllDistributions({ search, referenceType, dateFrom, dateTo }, getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const recent = async (req: Request, res: Response) => {
  const data = await distributionService.recentDistributions(10, getSU(req))
  res.json({ data })
}

export const byItem = async (req: Request, res: Response) => {
  try {
    const data = await distributionService.getDistributionsByItem(parseInt(req.params.id), getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const byEntity = async (req: Request, res: Response) => {
  try {
    const data = await distributionService.getDistributionsByEntity(parseInt(req.params.id), getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
