import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import prisma from '../prisma'

const router = express.Router()

router.use(authGuard, roleGuard(['ADMIN']))

router.get('/', async (req, res) => {
  const logs = await prisma.log.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  res.json({ data: logs })
})

export default router
