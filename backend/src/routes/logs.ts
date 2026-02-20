import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import prisma from '../prisma'

const router = express.Router()
router.use(authGuard, roleGuard(['ADMIN']))

// ─── Helpers ────────────────────────────────────────────────────────────────

const AR_MONTHS = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
]

const formatUser = (user?: { name: string | null; email: string | null } | null) =>
  user?.name ?? user?.email ?? '—'

const formatEmployee = (emp?: { name: string | null; surname: string | null; rank: string | null } | null) => {
  if (!emp) return undefined
  return [emp.rank, emp.name, emp.surname].filter((part) => Boolean(part)).join(' ').trim() || undefined
}

type LogRecord = {
  id: number
  action: string
  table: string
  recordId: number | null
  user: {
    email: string | null
    name: string | null
  } | null
  createdAt: Date
}

type LogWithExtras = LogRecord & {
  transactionType?: string
  equipmentNames?: string[]
  counterparty?: string
  assignedTo?: string
}

type ReceptionDetail = {
  id: number
  supplier: { name: string | null } | null
  user: { name: string | null; email: string | null }
  items: {
    item: { name: string | null; sku: string | null }
  }[]
}

type DistributionDetail = {
  id: number
  beneficiary: { name: string | null } | null
  assignedTo: { name: string | null; surname: string | null; rank: string | null } | null
  items: {
    item: { name: string | null; sku: string | null }
  }[]
}

const loadReceptionDetails = async (ids: number[]): Promise<ReceptionDetail[]> =>
  ids.length === 0
    ? []
    : await prisma.reception.findMany({
      where: { id: { in: ids } },
      include: {
        supplier: { select: { name: true } },
        user: { select: { name: true, email: true } },
        items: {
          include: { item: { select: { name: true, sku: true } } },
        },
      },
    })

const loadDistributionDetails = async (ids: number[]): Promise<DistributionDetail[]> =>
  ids.length === 0
    ? []
    : await prisma.distribution.findMany({
      where: { id: { in: ids } },
      include: {
        beneficiary: { select: { name: true } },
        assignedTo: { select: { name: true, surname: true, rank: true } },
        items: {
          include: { item: { select: { name: true, sku: true } } },
        },
      },
    })

const attachLogDetails = async (logs: LogRecord[]): Promise<LogWithExtras[]> => {
  const receptionIds = Array.from(
    new Set(logs.filter((l) => l.table === 'Reception' && l.recordId).map((l) => l.recordId!)),
  )
  const distributionIds = Array.from(
    new Set(logs.filter((l) => l.table === 'Distribution' && l.recordId).map((l) => l.recordId!)),
  )

  const [receptions, distributions] = await Promise.all([
    loadReceptionDetails(receptionIds),
    loadDistributionDetails(distributionIds),
  ])

  const receptionMap = new Map<number, {
    equipmentNames: string[]
    counterparty?: string
    assignedTo?: string
  }>()
  receptions.forEach((rec) => {
    receptionMap.set(rec.id, {
      equipmentNames: rec.items.map((item) => item.item.name ?? item.item.sku ?? '—'),
      counterparty: rec.supplier?.name ?? '—',
      assignedTo: formatUser(rec.user),
    })
  })

  const distributionMap = new Map<number, {
    equipmentNames: string[]
    counterparty?: string
    assignedTo?: string
  }>()
  distributions.forEach((dist) => {
    distributionMap.set(dist.id, {
      equipmentNames: dist.items.map((item) => item.item.name ?? item.item.sku ?? '—'),
      counterparty: dist.beneficiary?.name ?? '—',
      assignedTo: formatEmployee(dist.assignedTo) ?? '—',
    })
  })

  return logs.map((log) => {
    const base: LogWithExtras = {
      ...log,
      transactionType:
        log.table === 'Reception' ? 'استقبال' : log.table === 'Distribution' ? 'توزيع' : undefined,
    }

    if (log.recordId) {
      if (log.table === 'Reception') {
        const detail = receptionMap.get(log.recordId)
        if (detail) {
          base.equipmentNames = detail.equipmentNames
          base.counterparty = detail.counterparty
          base.assignedTo = detail.assignedTo
        }
      }
      if (log.table === 'Distribution') {
        const detail = distributionMap.get(log.recordId)
        if (detail) {
          base.equipmentNames = detail.equipmentNames
          base.counterparty = detail.counterparty
          base.assignedTo = detail.assignedTo
        }
      }
    }

    return base
  })
}

// ─── GET /api/logs  (filterable list) ────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const {
      from, to,
      action, table: tbl,
      limit = '500',
      page  = '1',
    } = req.query as Record<string, string>

    const where: any = {}
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }
    if (action) where.action = action
    if (tbl)    where.table  = tbl

    const take = Math.min(Number(limit) || 500, 2000)
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.log.count({ where }),
    ])

    const enrichedLogs = await attachLogDetails(logs)

    res.json({ data: enrichedLogs, meta: { total, page: Number(page), limit: take } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/logs/stats  (aggregated statistics) ────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const { year } = req.query as Record<string, string>
    const targetYear = Number(year) || new Date().getFullYear()

    const from = new Date(`${targetYear}-01-01T00:00:00.000Z`)
    const to   = new Date(`${targetYear}-12-31T23:59:59.999Z`)

    const all = await prisma.log.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { id: true, action: true, table: true, createdAt: true },
    })

    // ── Per-month counts
    const byMonth: Record<number, number> = {}
    for (let m = 0; m < 12; m++) byMonth[m] = 0
    all.forEach((l: { action: string; table: string; createdAt: Date }) => { byMonth[new Date(l.createdAt).getMonth()]++ })

    const monthlyData = Object.entries(byMonth).map(([mIdx, count]) => ({
      month: AR_MONTHS[Number(mIdx)],
      monthIndex: Number(mIdx) + 1,
      count,
    }))

    // ── Per-action counts
    const byAction: Record<string, number> = {}
    all.forEach((l: { action: string; table: string; createdAt: Date }) => { byAction[l.action] = (byAction[l.action] ?? 0) + 1 })

    // ── Per-table counts
    const byTable: Record<string, number> = {}
    all.forEach((l: { action: string; table: string; createdAt: Date }) => { byTable[l.table] = (byTable[l.table] ?? 0) + 1 })

    // ── All-time totals
    const [totalLogs, totalThisMonth] = await Promise.all([
      prisma.log.count(),
      prisma.log.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ])

    res.json({
      data: {
        year: targetYear,
        totalLogs,
        totalThisMonth,
        monthlyData,
        byAction: Object.entries(byAction)
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count),
        byTable: Object.entries(byTable)
          .map(([table, count]) => ({ table, count }))
          .sort((a, b) => b.count - a.count),
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/logs/monthly-report  (full month data for export) ──────────────

router.get('/monthly-report', async (req, res) => {
  try {
    const { year, month } = req.query as Record<string, string>
    const y = Number(year)  || new Date().getFullYear()
    const m = Number(month) || new Date().getMonth() + 1

    const from = new Date(y, m - 1, 1)
    const to   = new Date(y, m, 0, 23, 59, 59, 999)

    const logs = await prisma.log.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true, name: true } } },
    })

    // summary grouped by action
    const summary: Record<string, number> = {}
    logs.forEach((l: { action: string }) => { summary[l.action] = (summary[l.action] ?? 0) + 1 })

    const enrichedLogs = await attachLogDetails(logs)

    res.json({
      data: {
        year: y,
        month: m,
        monthName: AR_MONTHS[m - 1],
        totalRows: logs.length,
        summary,
        logs: enrichedLogs,
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/logs/meta  (distinct actions + tables for filters) ──────────────

router.get('/meta', async (req, res) => {
  try {
    const [actions, tables] = await Promise.all([
      prisma.log.findMany({ distinct: ['action'], select: { action: true } }),
      prisma.log.findMany({ distinct: ['table'],  select: { table:  true } }),
    ])
    res.json({
      data: {
        actions: actions.map((a: { action: string }) => a.action),
        tables:  tables.map((t: { table: string }) => t.table),
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
