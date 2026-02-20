import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as receptionService from '../services/receptionService'

const router = express.Router()

router.use(authGuard)

router.post('/', roleGuard(['ADMIN','STORE_KEEPER']), async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { reference, items, referenceNumber, referenceType, referenceDate, supplierId, notes } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'يرجى إضافة تجهيز واحد على الأقل' })
    }

    // توليد مرجع فريد تلقائياً إذا لم يُرسل
    const finalReference = (reference && reference.trim())
      ? reference.trim()
      : `RCPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const reception = await receptionService.createReception(userId, finalReference, items, {
      referenceNumber,
      referenceType,
      referenceDate: referenceDate ? new Date(referenceDate) : undefined,
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      notes
    })
    res.json({ data: reception })
  } catch (err: any) {
    console.error('Reception error:', err.message)
    res.status(400).json({ error: err.message })
  }
})

router.get('/reference-types', authGuard, async (req, res) => {
  const types = await receptionService.getReferenceTypes()
  res.json({ data: types })
})

router.get('/by-item/:itemId', async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId)
    if (isNaN(itemId)) return res.status(400).json({ error: 'معرف التجهيز غير صالح' })
    const reception = await receptionService.getLatestReceptionByItem(itemId)
    res.json({ data: reception })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/recent', authGuard, async (req, res) => {
  const list = await receptionService.recentReceptions()
  res.json({ data: list })
})

export default router
