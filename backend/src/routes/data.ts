import express from 'express'
import prisma from '../prisma'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import { hashPassword } from '../utils/hash'
import { createAuditLog } from '../services/auditService'

const router = express.Router()
router.use(authGuard, roleGuard(['ADMIN']))

// ─── EXPORT ──────────────────────────────────────────────────────────────────

router.get('/export', async (req, res) => {
  try {
    const [users, items, entities, employees, receptions, receptionItems, distributions, distributionItems, logs] =
      await Promise.all([
        prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } }),
        prisma.item.findMany(),
        prisma.entity.findMany(),
        prisma.employee.findMany(),
        prisma.reception.findMany(),
        prisma.receptionItem.findMany(),
        prisma.distribution.findMany(),
        prisma.distributionItem.findMany(),
        prisma.log.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
      ])

    const payload = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: { users, items, entities, employees, receptions, receptionItems, distributions, distributionItems, logs },
    }

    const actor = (req as any).user
    await createAuditLog({
      action: 'EXPORT_DATA',
      entity: 'System',
      actorEmail: actor?.email,
      actorId: actor?.id,
      details: JSON.stringify({ tables: Object.keys(payload.data), exportedAt: payload.exportedAt }),
    })

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="warehouse-backup-${Date.now()}.json"`)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── IMPORT ──────────────────────────────────────────────────────────────────

router.post('/import', async (req, res) => {
  try {
    const { data, mode = 'merge' } = req.body as {
      data: any
      mode: 'merge' | 'replace'
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'بيانات JSON غير صالحة أو مفقودة' })
    }

    const stats: Record<string, number> = {}

    // ── Items ──────────────────────────────────────────────────────────────
    if (Array.isArray(data.items) && data.items.length > 0) {
      if (mode === 'replace') {
        // Must delete child records first to respect FK constraints
        await prisma.distributionItem.deleteMany()
        await prisma.receptionItem.deleteMany()
        await prisma.item.deleteMany()
      }
      let count = 0
      for (const item of data.items) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, receptionItems, distributionItems, ...rest } = item
        if (!rest.sku) continue
        await prisma.item.upsert({
          where: { sku: rest.sku },
          update: rest,
          create: rest,
        })
        count++
      }
      stats.items = count
    }

    // ── Entities ───────────────────────────────────────────────────────────
    if (Array.isArray(data.entities) && data.entities.length > 0) {
      if (mode === 'replace') {
        // Must delete dependents first in the right order
        await prisma.distributionItem.deleteMany()
        await prisma.distribution.deleteMany()
        await prisma.receptionItem.deleteMany()
        await prisma.reception.deleteMany()
        await prisma.employee.deleteMany()
        await prisma.entity.deleteMany()
      }
      let count = 0
      for (const entity of data.entities) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, employees, distributions, receptionsSent, ...rest } = entity
        if (!rest.name || !rest.type || !rest.phone) continue
        try {
          await prisma.entity.create({ data: rest })
        } catch {
          // entity might already exist (merge mode) – skip silently
        }
        count++
      }
      stats.entities = count
    }

    const actor = (req as any).user
    await createAuditLog({
      action: 'IMPORT_DATA',
      entity: 'System',
      actorEmail: actor?.email,
      actorId: actor?.id,
      details: JSON.stringify({ mode, stats }),
    })

    res.json({ data: { ok: true, stats } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PREVIEW (row counts) ─────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const [users, items, entities, employees, receptions, distributions] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.entity.count(),
      prisma.employee.count(),
      prisma.reception.count(),
      prisma.distribution.count(),
    ])
    res.json({ data: { users, items, entities, employees, receptions, distributions } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
