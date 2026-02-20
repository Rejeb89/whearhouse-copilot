import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import { listAuditLogs } from '../services/auditService'

const router = express.Router()
router.use(authGuard, roleGuard(['ADMIN']))

router.get('/', async (_req, res) => {
  try {
    const logs = await listAuditLogs(300)
    res.json({ data: logs })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
