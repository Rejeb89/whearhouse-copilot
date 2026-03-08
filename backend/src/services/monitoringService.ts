import prisma from '../config/database'

/* ─── List distinct security units with summary stats ─── */
export const listSecurityUnits = async () => {
  // Get all distinct non-null security units
  const units = await prisma.user.findMany({
    where: { securityUnit: { not: null } },
    select: { securityUnit: true },
    distinct: ['securityUnit'],
  })

  const uniqueUnits = [...new Set(units.map(u => u.securityUnit!).filter(Boolean))]

  const result = await Promise.all(
    uniqueUnits.map(async (unit) => {
      const [users, items, vehicles, receptions, distributions, entities, budgets] =
        await Promise.all([
          prisma.user.count({ where: { securityUnit: unit } }),
          prisma.item.count({ where: { securityUnit: unit } }),
          prisma.vehicle.count({ where: { securityUnit: unit } }),
          prisma.reception.count({ where: { securityUnit: unit } }),
          prisma.distribution.count({ where: { securityUnit: unit } }),
          prisma.entity.count({ where: { securityUnit: unit } }),
          prisma.budget.count({ where: { securityUnit: unit } }),
        ])
      return { securityUnit: unit, users, items, vehicles, receptions, distributions, entities, budgets }
    })
  )

  return result
}

/* ─── Get unit overview (stats for a single unit) ─── */
export const getUnitOverview = async (unit: string) => {
  const [
    users, items, vehicles, receptions, distributions, entities, budgets, logs,
    lowStockItems, recentLogs, recentDistributions, activeBudgets,
  ] = await Promise.all([
    prisma.user.count({ where: { securityUnit: unit } }),
    prisma.item.count({ where: { securityUnit: unit } }),
    prisma.vehicle.count({ where: { securityUnit: unit } }),
    prisma.reception.count({ where: { securityUnit: unit } }),
    prisma.distribution.count({ where: { securityUnit: unit } }),
    prisma.entity.count({ where: { securityUnit: unit } }),
    prisma.budget.count({ where: { securityUnit: unit } }),
    prisma.log.count({ where: { securityUnit: unit } }),
    prisma.item.findMany({
      where: { securityUnit: unit },
      orderBy: { quantity: 'asc' },
      take: 10,
    }),
    prisma.log.findMany({
      where: { securityUnit: unit },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // last 7 distributions with items + beneficiary
    prisma.distribution.findMany({
      where: { securityUnit: unit },
      include: {
        beneficiary: true,
        items: {
          include: {
            item: { select: { id: true, name: true, quantity: true, lowStockThreshold: true } },
          },
        },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 7,
    }),
    // active budgets with expenses for financial summary
    (prisma.budget as any).findMany({
      where: { securityUnit: unit, status: 'active' },
      include: { expenses: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // compute financial totals
  const financialSummary = {
    totalBudget:    (activeBudgets as any[]).reduce((s: number, b: any) => s + (b.amount || 0), 0),
    totalSpent:     (activeBudgets as any[]).reduce((s: number, b: any) =>
      s + (b.expenses || []).reduce((es: number, e: any) => es + (e.amount || 0), 0), 0),
    activeBudgets:  (activeBudgets as any[]).map((b: any) => {
      const spent = (b.expenses || []).reduce((es: number, e: any) => es + (e.amount || 0), 0)
      return { id: b.id, name: b.name, department: b.department, amount: b.amount, spent, startDate: b.startDate, endDate: b.endDate }
    }),
  }

  return {
    users, items, vehicles, receptions, distributions, entities, budgets, logs,
    lowStockItems, recentLogs,
    recentDistributions,
    financialSummary,
  }
}

/* ─── Get items for a specific unit ─── */
export const getUnitItems = async (unit: string) => {
  return prisma.item.findMany({
    where: { securityUnit: unit },
    orderBy: { updatedAt: 'desc' },
  })
}

/* ─── Get full item detail with all transactions ─── */
export const getUnitItemDetail = async (unit: string, itemId: number) => {
  const item = await (prisma.item as any).findFirst({
    where: { id: itemId, securityUnit: unit },
  })
  if (!item) return null

  const receptionItems = await prisma.receptionItem.findMany({
    where: { itemId },
    include: {
      reception: {
        include: {
          supplier:  true,
          collector: true,
          user:      true,
        },
      },
    },
    orderBy: { reception: { createdAt: 'desc' } },
  })

  const distributionItems = await (prisma.distributionItem as any).findMany({
    where: { itemId },
    include: {
      distribution: {
        include: {
          beneficiary: true,
          assignedTo:  true,
          user:        true,
          receipt:     true,
        },
      },
    },
    orderBy: { distribution: { createdAt: 'desc' } },
  })

  const totalReceived    = receptionItems.reduce((s: number, r: any) => s + r.quantity, 0)
  const totalDistributed = distributionItems.reduce((s: number, d: any) => s + d.quantity, 0)

  return { item, receptionItems, distributionItems, totalReceived, totalDistributed }
}

/* ─── Get vehicles for a specific unit ─── */
export const getUnitVehicles = async (unit: string) => {
  return prisma.vehicle.findMany({
    where: { securityUnit: unit },
    include: { entity: true },
    orderBy: { createdAt: 'desc' },
  })
}

/* ─── Get receptions for a specific unit ─── */
export const getUnitReceptions = async (unit: string) => {
  return prisma.reception.findMany({
    where: { securityUnit: unit },
    include: {
      supplier: true,
      collector: true,
      user:     true,
      items: {
        include: {
          item: {
            select: {
              id: true, name: true, sku: true, category: true,
              description: true, quantity: true, lowStockThreshold: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/* ─── Get distributions for a specific unit ─── */
export const getUnitDistributions = async (unit: string) => {
  return prisma.distribution.findMany({
    where: { securityUnit: unit },
    include: {
      beneficiary: true,
      assignedTo:  true,
      user:        true,
      items: {
        include: {
          item: {
            select: {
              id: true, name: true, sku: true, category: true,
              description: true, quantity: true, lowStockThreshold: true,
            },
          },
        },
      },
    } as any,
    orderBy: { createdAt: 'desc' },
  })
}

/* ─── Get entities for a specific unit ─── */
export const getUnitEntities = async (unit: string) => {
  return prisma.entity.findMany({
    where: { securityUnit: unit },
    orderBy: { createdAt: 'desc' },
  })
}

/* ─── Get budgets for a specific unit ─── */
export const getUnitBudgets = async (unit: string) => {
  const budgets = await prisma.budget.findMany({
    where: { securityUnit: unit },
    include: {
      expenses:       { orderBy: { date: 'desc' } },
      supplyRequests: { orderBy: { createdAt: 'desc' } },
    } as any,
    orderBy: { createdAt: 'desc' },
  })
  // parse JSON attachments in expenses & supplyRequests
  return budgets.map((b: any) => ({
    ...b,
    expenses: b.expenses.map((e: any) => ({
      ...e,
      attachments: (() => { try { return JSON.parse(e.attachments || '[]') } catch { return [] } })(),
    })),
    supplyRequests: b.supplyRequests.map((r: any) => ({
      ...r,
      attachments: (() => { try { return JSON.parse(r.attachments || '[]') } catch { return [] } })(),
    })),
  }))
}

/* ─── Get logs for a specific unit ─── */
export const getUnitLogs = async (unit: string) => {
  return prisma.log.findMany({
    where: { securityUnit: unit },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}

/* ─── Get users belonging to a specific unit ─── */
export const getUnitUsers = async (unit: string) => {
  return prisma.user.findMany({
    where: { securityUnit: unit },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      personalNumber: true,
      region: true,
      title: true,
      createdAt: true,
    } as any,
    orderBy: { createdAt: 'desc' },
  })
}

/* ─── Get delivery receipts for a specific unit ─── */
export const getUnitReceipts = async (unit: string) => {
  return (prisma.deliveryReceipt as any).findMany({
    where: { distribution: { securityUnit: unit } },
    include: {
      distribution: {
        select: {
          id:              true,
          deliveredByName: true,
          beneficiary:    { select: { id: true, name: true } },
          assignedTo:     { select: { id: true, name: true, surname: true, rank: true, number: true } },
          user:           { select: { id: true, email: true, name: true } },
          items:          { select: { id: true, quantity: true } },
        },
      },
      createdBy:  { select: { id: true, email: true, name: true } },
      approvedBy: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
