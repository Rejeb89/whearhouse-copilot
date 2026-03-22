import { Request, Response } from 'express'
import * as receiptService from '../services/receiptService'
import prisma from '../config/database'

const UNRESTRICTED_ROLES = ['ADMIN', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']
const getSU = (req: Request) => {
  const u = (req as any).user
  return UNRESTRICTED_ROLES.includes(u?.role) ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1')
    const limit = parseInt((req.query.limit as string) || '20')
    const receipts = await receiptService.listReceipts(page, limit, getSU(req))
    res.json({ data: receipts })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const byDistribution = async (req: Request, res: Response) => {
  try {
    const receipt = await receiptService.getReceiptByDistribution(parseInt(req.params.distId), getSU(req))
    if (!receipt) return res.status(404).json({ error: 'لا يوجد وصل لهذه العملية' })
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const receipt = await receiptService.getReceiptById(parseInt(req.params.id), getSU(req))
    if (!receipt) return res.status(404).json({ error: 'الوصل غير موجود' })
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const approve = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user
    const receipt = await receiptService.approveReceipt(parseInt(req.params.id), actor.id, actor.email)
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const cancel = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user
    const receipt = await receiptService.cancelReceipt(parseInt(req.params.id), actor.id, actor.email)
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const uploadSignedAttachment = async (req: Request, res: Response) => {
  try {
    const { signedAttachment } = req.body
    const receipt = await (prisma as any).deliveryReceipt.update({
      where: { id: parseInt(req.params.id) },
      data: { signedAttachment: signedAttachment ? JSON.stringify(signedAttachment) : null },
    })
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
