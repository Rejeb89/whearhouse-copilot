import { Request, Response } from 'express'
import * as receptionService from '../services/receptionService'
import { humanizePrismaError } from '../utils/prismaError'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const create = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const su = (req as any).user?.securityUnit
    const { reference, items, referenceNumber, referenceType, referenceDate, supplierId, collectorId, notes } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'يرجى إضافة تجهيز واحد على الأقل' })
    }

    const finalReference = (reference && reference.trim())
      ? reference.trim()
      : `RCPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const reception = await receptionService.createReception(userId, finalReference, items, {
      referenceNumber,
      referenceType,
      referenceDate: referenceDate ? new Date(referenceDate) : undefined,
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      collectorId: collectorId ? parseInt(collectorId) : undefined,
      notes,
    }, su)
    res.json({ data: reception })
  } catch (err: any) {
    console.error('Reception error:', err.message)
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    const { search, referenceType, dateFrom, dateTo } = req.query as Record<string, string>
    const data = await receptionService.getAllReceptions({ search, referenceType, dateFrom, dateTo }, getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const referenceTypes = async (req: Request, res: Response) => {
  const types = await receptionService.getReferenceTypes(getSU(req))
  res.json({ data: types })
}

export const byItem = async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId)
    if (isNaN(itemId)) return res.status(400).json({ error: 'معرف التجهيز غير صالح' })
    const reception = await receptionService.getLatestReceptionByItem(itemId, getSU(req))
    res.json({ data: reception })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const recent = async (req: Request, res: Response) => {
  const data = await receptionService.recentReceptions(10, getSU(req))
  res.json({ data })
}

export const bySupplier = async (req: Request, res: Response) => {
  try {
    const supplierId = parseInt(req.params.supplierId)
    if (isNaN(supplierId)) return res.status(400).json({ error: 'معرف الجهة غير صالح' })
    const data = await receptionService.getReceptionsBySupplier(supplierId, getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
