import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as distributionService from '../services/distributionService'

const router = express.Router()

router.use(authGuard)

router.post('/', roleGuard(['ADMIN','STORE_KEEPER']), async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { items, beneficiaryId, assignedToId, notes, referenceType, referenceNumber, referenceDate, deliveredByName } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'يرجى إضافة تجهيز واحد على الأقل' })
    }

    const reference = `DIST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const distribution = await distributionService.createDistribution(
      userId, reference, items, beneficiaryId, assignedToId, notes,
      referenceType, referenceNumber, referenceDate, deliveredByName
    )
    res.json({ data: distribution })
  } catch (err: any) {
    console.error('Distribution POST error:', err)
    res.status(400).json({ error: err.message })
  }
})

router.get('/recent', authGuard, async (req, res) => {
  const list = await distributionService.recentDistributions()
  res.json({ data: list })
})

router.get('/item/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params
    const items = await distributionService.getDistributionsByItem(parseInt(id))
    res.json({ data: items })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/entity/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params
    const distributions = await distributionService.getDistributionsByEntity(parseInt(id))
    res.json({ data: distributions })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
