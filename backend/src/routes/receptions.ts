import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as receptionService from '../services/receptionService'

const router = express.Router()

router.use(authGuard)

router.post('/', roleGuard(['ADMIN','STORE_KEEPER']), async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { reference, items, referenceNumber, referenceDate, supplierId, notes } = req.body
    const reception = await receptionService.createReception(userId, reference, items, {
      referenceNumber,
      referenceDate: referenceDate ? new Date(referenceDate) : undefined,
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      notes
    })
    res.json({ data: reception })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/recent', authGuard, async (req, res) => {
  const list = await receptionService.recentReceptions()
  res.json({ data: list })
})

export default router
