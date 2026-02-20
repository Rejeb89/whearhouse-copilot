import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as receiptService from '../services/receiptService'

const router = express.Router()
router.use(authGuard)

// List all receipts
router.get('/', async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1')
    const limit = parseInt((req.query.limit as string) || '20')
    const receipts = await receiptService.listReceipts(page, limit)
    res.json({ data: receipts })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get receipt by distribution ID  (must be before /:id to avoid shadowing)
router.get('/distribution/:distId', async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptByDistribution(parseInt(req.params.distId))
    if (!receipt) return res.status(404).json({ error: 'لا يوجد وصل لهذه العملية' })
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptById(parseInt(req.params.id))
    if (!receipt) return res.status(404).json({ error: 'الوصل غير موجود' })
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Approve receipt (ADMIN or STORE_KEEPER only)
router.patch('/:id/approve', roleGuard(['ADMIN', 'STORE_KEEPER']), async (req, res) => {
  try {
    const actor = (req as any).user
    const receipt = await receiptService.approveReceipt(parseInt(req.params.id), actor.id, actor.email)
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Cancel receipt (ADMIN or STORE_KEEPER only)
router.patch('/:id/cancel', roleGuard(['ADMIN', 'STORE_KEEPER']), async (req, res) => {
  try {
    const actor = (req as any).user
    const receipt = await receiptService.cancelReceipt(parseInt(req.params.id), actor.id, actor.email)
    res.json({ data: receipt })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
