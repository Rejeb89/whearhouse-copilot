import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as distributionService from '../services/distributionService'

const router = express.Router()

router.use(authGuard)

router.post('/', roleGuard(['ADMIN','STORE_KEEPER']), async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { reference, items, beneficiaryId } = req.body
    const distribution = await distributionService.createDistribution(userId, reference, items, beneficiaryId)
    res.json({ data: distribution })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/recent', authGuard, async (req, res) => {
  const list = await distributionService.recentDistributions()
  res.json({ data: list })
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
