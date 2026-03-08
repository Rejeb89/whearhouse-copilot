import prisma from '../config/database'

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
        log.table === 'Reception' ? 'دخل' : log.table === 'Distribution' ? 'خرج' : undefined,
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

// ─── Public API ──────────────────────────────────────────────────────────────

export const queryLogs = async (filters: {
  from?: string; to?: string;
  action?: string; table?: string;
  limit?: string; page?: string;
}, securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = new Date(filters.from)
    if (filters.to)   where.createdAt.lte = new Date(filters.to)
  }
  if (filters.action) where.action = filters.action
  if (filters.table)  where.table  = filters.table

  const take = Math.min(Number(filters.limit) || 500, 2000)
  const skip = (Math.max(Number(filters.page) || 1, 1) - 1) * take

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

  return { data: enrichedLogs, meta: { total, page: Number(filters.page), limit: take } }
}

export const getLogStats = async (targetYear: number, securityUnit?: string | null) => {
  const from = new Date(`${targetYear}-01-01T00:00:00.000Z`)
  const to   = new Date(`${targetYear}-12-31T23:59:59.999Z`)

  const logWhere: any = { createdAt: { gte: from, lte: to } }
  if (securityUnit) logWhere.securityUnit = securityUnit

  const all = await prisma.log.findMany({
    where: logWhere,
    select: { id: true, action: true, table: true, createdAt: true },
  })

  // Per-month counts
  const byMonth: Record<number, number> = {}
  for (let m = 0; m < 12; m++) byMonth[m] = 0
  all.forEach((l: { action: string; table: string; createdAt: Date }) => { byMonth[new Date(l.createdAt).getMonth()]++ })

  const monthlyData = Object.entries(byMonth).map(([mIdx, count]) => ({
    month: AR_MONTHS[Number(mIdx)],
    monthIndex: Number(mIdx) + 1,
    count,
  }))

  // Per-action counts
  const byAction: Record<string, number> = {}
  all.forEach((l: { action: string; table: string; createdAt: Date }) => { byAction[l.action] = (byAction[l.action] ?? 0) + 1 })

  // Per-table counts
  const byTable: Record<string, number> = {}
  all.forEach((l: { action: string; table: string; createdAt: Date }) => { byTable[l.table] = (byTable[l.table] ?? 0) + 1 })

  // All-time totals
  const countWhere: any = {}
  if (securityUnit) countWhere.securityUnit = securityUnit
  const countThisMonthWhere: any = {
    createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  }
  if (securityUnit) countThisMonthWhere.securityUnit = securityUnit
  const [totalLogs, totalThisMonth] = await Promise.all([
    prisma.log.count({ where: countWhere }),
    prisma.log.count({ where: countThisMonthWhere }),
  ])

  return {
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
  }
}

export const getMonthlyReport = async (year: number, month: number, securityUnit?: string | null) => {
  const from = new Date(year, month - 1, 1)
  const to   = new Date(year, month, 0, 23, 59, 59, 999)

  const logWhere: any = { createdAt: { gte: from, lte: to } }
  if (securityUnit) logWhere.securityUnit = securityUnit

  const logs = await prisma.log.findMany({
    where: logWhere,
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { email: true, name: true } } },
  })

  const summary: Record<string, number> = {}
  logs.forEach((l: { action: string }) => { summary[l.action] = (summary[l.action] ?? 0) + 1 })

  const enrichedLogs = await attachLogDetails(logs)

  return {
    year,
    month,
    monthName: AR_MONTHS[month - 1],
    totalRows: logs.length,
    summary,
    logs: enrichedLogs,
  }
}

export const getLogMeta = async () => {
  const [actions, tables] = await Promise.all([
    prisma.log.findMany({ distinct: ['action'], select: { action: true } }),
    prisma.log.findMany({ distinct: ['table'],  select: { table:  true } }),
  ])
  return {
    actions: actions.map((a: { action: string }) => a.action),
    tables:  tables.map((t: { table: string }) => t.table),
  }
}
