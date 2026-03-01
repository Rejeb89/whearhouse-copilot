import prisma from '../config/database'
import { hashPassword } from '../utils/hash'
import { createAuditLog } from './auditService'

/* ─── EXPORT ─── */
export const exportData = async (actorEmail?: string, actorId?: number) => {
  const [users, items, entities, employees, receptions, receptionItems, distributions, distributionItems, logs, budgets, budgetExpenses] =
    await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } }),
      prisma.item.findMany(),
      prisma.entity.findMany(),
      prisma.employee.findMany(),
      prisma.reception.findMany(),
      prisma.receptionItem.findMany(),
      prisma.distribution.findMany(),
      prisma.distributionItem.findMany(),
      prisma.log.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.budget.findMany(),
      prisma.budgetExpense.findMany(),
    ])

  const payload = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    data: { users, items, entities, employees, receptions, receptionItems, distributions, distributionItems, logs, budgets, budgetExpenses },
  }

  await createAuditLog({
    action: 'EXPORT_DATA',
    entity: 'System',
    actorEmail,
    actorId,
    details: JSON.stringify({
      exportedAt: payload.exportedAt,
      counts: {
        users: users.length, items: items.length, entities: entities.length,
        employees: employees.length, receptions: receptions.length,
        distributions: distributions.length,
      },
    }),
  })

  return payload
}

/* ─── IMPORT ─── */
export const importData = async (
  data: any,
  mode: 'merge' | 'replace' = 'merge',
  actorEmail?: string,
  actorId?: number,
) => {
  if (!data || typeof data !== 'object') {
    throw new Error('بيانات JSON غير صالحة أو مفقودة')
  }

  const stats: Record<string, number> = {}
  const importErrors: string[] = []

  // Replace mode: delete all in correct FK dependency order
  if (mode === 'replace') {
    await prisma.distributionItem.deleteMany()
    await prisma.receptionItem.deleteMany()
    await prisma.deliveryReceipt.deleteMany()
    await prisma.distribution.deleteMany()
    await prisma.reception.deleteMany()
    await prisma.employee.deleteMany()
    await prisma.entity.deleteMany()
    await prisma.item.deleteMany()
    await prisma.log.deleteMany()
    await prisma.user.deleteMany()
    await prisma.budgetExpense.deleteMany()
    await prisma.budget.deleteMany()
  }

  const defaultPasswordHash = await hashPassword('admin123')

  // Users
  if (Array.isArray(data.users) && data.users.length > 0) {
    let count = 0
    for (const raw of data.users) {
      const { password: _pw, createdAt: _ca, updatedAt: _ua, receptions: _r, distributions: _d, logs: _l, ...user } = raw
      if (!user.id || !user.email || !user.role) continue
      try {
        await prisma.user.upsert({
          where: { id: user.id },
          update: { email: user.email, name: user.name, role: user.role },
          create: { ...user, password: defaultPasswordHash },
        })
        count++
      } catch { /* skip */ }
    }
    stats.users = count
  }

  // Items
  if (Array.isArray(data.items) && data.items.length > 0) {
    let count = 0
    for (const raw of data.items) {
      const { createdAt: _ca, updatedAt: _ua, receptionItems: _ri, distributionItems: _di, ...item } = raw
      if (!item.id || !item.sku) continue
      try {
        await prisma.item.upsert({ where: { id: item.id }, update: item, create: item })
        count++
      } catch { /* skip */ }
    }
    stats.items = count
  }

  // Entities
  if (Array.isArray(data.entities) && data.entities.length > 0) {
    let count = 0
    for (const raw of data.entities) {
      const { createdAt: _ca, updatedAt: _ua, employees: _e, distributions: _d, receptionsSent: _r, ...entity } = raw
      if (!entity.id || !entity.name || !entity.type) continue
      try {
        await prisma.entity.upsert({ where: { id: entity.id }, update: entity, create: entity })
        count++
      } catch { /* skip */ }
    }
    stats.entities = count
  }

  // Employees
  if (Array.isArray(data.employees) && data.employees.length > 0) {
    let count = 0
    for (const raw of data.employees) {
      const { createdAt: _ca, updatedAt: _ua, entity: _e, distributions: _d, ...emp } = raw
      if (!emp.id || !emp.entityId) continue
      try {
        await prisma.employee.upsert({ where: { id: emp.id }, update: emp, create: emp })
        count++
      } catch { /* skip */ }
    }
    stats.employees = count
  }

  // Receptions
  if (Array.isArray(data.receptions) && data.receptions.length > 0) {
    let count = 0
    for (const raw of data.receptions) {
      const { createdAt: _ca, updatedAt: _ua, items: _i, user: _u, supplier: _s, ...rec } = raw
      if (!rec.id || !rec.reference || !rec.userId) continue
      try {
        await prisma.reception.upsert({ where: { id: rec.id }, update: rec, create: rec })
        count++
      } catch { /* skip */ }
    }
    stats.receptions = count
  }

  // Reception Items
  if (Array.isArray(data.receptionItems) && data.receptionItems.length > 0) {
    let count = 0
    for (const raw of data.receptionItems) {
      const { createdAt: _ca, updatedAt: _ua, reception: _r, item: _i, ...ri } = raw
      if (!ri.id || !ri.receptionId || !ri.itemId) continue
      try {
        await prisma.receptionItem.upsert({ where: { id: ri.id }, update: ri, create: ri })
        count++
      } catch { /* skip */ }
    }
    stats.receptionItems = count
  }

  // Distributions
  if (Array.isArray(data.distributions) && data.distributions.length > 0) {
    let count = 0
    for (const raw of data.distributions) {
      const { createdAt: _ca, updatedAt: _ua, items: _i, user: _u, beneficiary: _b, assignedTo: _a, ...dist } = raw
      if (!dist.id || !dist.reference || !dist.userId) continue
      try {
        await prisma.distribution.upsert({ where: { id: dist.id }, update: dist, create: dist })
        count++
      } catch { /* skip */ }
    }
    stats.distributions = count
  }

  // Distribution Items
  if (Array.isArray(data.distributionItems) && data.distributionItems.length > 0) {
    let count = 0
    for (const raw of data.distributionItems) {
      const { createdAt: _ca, updatedAt: _ua, distribution: _d, item: _i, ...di } = raw
      if (!di.id || !di.distributionId || !di.itemId) continue
      try {
        await prisma.distributionItem.upsert({ where: { id: di.id }, update: di, create: di })
        count++
      } catch { /* skip */ }
    }
    stats.distributionItems = count
  }

  // Logs
  if (Array.isArray(data.logs) && data.logs.length > 0) {
    let count = 0
    for (const raw of data.logs) {
      const { createdAt: _ca, updatedAt: _ua, user: _u, ...log } = raw
      if (!log.id || !log.action) continue
      try {
        await prisma.log.upsert({ where: { id: log.id }, update: log, create: log })
        count++
      } catch { /* skip */ }
    }
    stats.logs = count
  }

  // Budgets
  if (Array.isArray(data.budgets) && data.budgets.length > 0) {
    let count = 0
    for (const raw of data.budgets) {
      const { expenses: _e, updatedAt: _ua, createdAt: _ca, ...budget } = raw
      if (!budget.id || !budget.name) continue
      try {
        await prisma.budget.upsert({ where: { id: budget.id }, update: budget, create: budget })
        count++
      } catch { /* skip */ }
    }
    stats.budgets = count
  }

  // Budget Expenses
  if (Array.isArray(data.budgetExpenses) && data.budgetExpenses.length > 0) {
    let count = 0
    for (const raw of data.budgetExpenses) {
      const { budget: _b, addedAt: _aa, ...expense } = raw
      if (!expense.id || !expense.budgetId) continue
      if (Array.isArray(expense.attachments)) expense.attachments = JSON.stringify(expense.attachments)
      try {
        await prisma.budgetExpense.upsert({ where: { id: expense.id }, update: expense, create: expense })
        count++
      } catch { /* skip */ }
    }
    stats.budgetExpenses = count
  }

  // Reset PostgreSQL sequences
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"','id'), COALESCE((SELECT MAX(id) FROM "User"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Item"','id'), COALESCE((SELECT MAX(id) FROM "Item"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Entity"','id'), COALESCE((SELECT MAX(id) FROM "Entity"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Employee"','id'), COALESCE((SELECT MAX(id) FROM "Employee"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Reception"','id'), COALESCE((SELECT MAX(id) FROM "Reception"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"ReceptionItem"','id'), COALESCE((SELECT MAX(id) FROM "ReceptionItem"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Distribution"','id'), COALESCE((SELECT MAX(id) FROM "Distribution"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"DistributionItem"','id'), COALESCE((SELECT MAX(id) FROM "DistributionItem"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Log"','id'), COALESCE((SELECT MAX(id) FROM "Log"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Budget"','id'), COALESCE((SELECT MAX(id) FROM "Budget"),0)+1,false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"BudgetExpense"','id'), COALESCE((SELECT MAX(id) FROM "BudgetExpense"),0)+1,false)`)
  } catch (seqErr: any) {
    console.error('[import] sequence reset error (non-fatal):', seqErr.message)
    importErrors.push('sequence_reset: ' + seqErr.message)
  }

  try {
    await createAuditLog({
      action: 'IMPORT_DATA',
      entity: 'System',
      actorEmail,
      actorId,
      details: JSON.stringify({ mode, stats }),
    })
  } catch (auditErr: any) {
    console.error('[import] audit log error (non-fatal):', auditErr.message)
  }

  return { ok: true, stats, errors: importErrors.length > 0 ? importErrors : undefined }
}

/* ─── CLEAR DATA ─── */
export const clearData = async (actorEmail?: string, actorId?: number) => {
  const adminUsers = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, name: true, role: true },
  })

  if (adminUsers.length === 0) {
    throw new Error('يجب أن يكون هناك مسؤول واحد على الأقل')
  }

  await prisma.deliveryReceipt.deleteMany()
  await prisma.distributionItem.deleteMany()
  await prisma.receptionItem.deleteMany()
  await prisma.distribution.deleteMany()
  await prisma.reception.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.entity.deleteMany()
  await prisma.item.deleteMany()
  await prisma.log.deleteMany()
  await prisma.budgetExpense.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.supplyRequest.deleteMany()
  await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } })

  // Reset sequences
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Item"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Entity"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Employee"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Reception"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"ReceptionItem"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Distribution"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"DistributionItem"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Log"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Budget"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"BudgetExpense"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"DeliveryReceipt"','id'), 1, false)`)
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"SupplyRequest"','id'), 1, false)`)
  } catch (seqErr: any) {
    console.error('[clear-data] sequence reset error:', seqErr.message)
  }

  await createAuditLog({
    action: 'CLEAR_DATA',
    entity: 'System',
    actorEmail,
    actorId,
    details: JSON.stringify({
      cleared: true,
      adminUsersPreserved: adminUsers.length,
      preservedAdmins: adminUsers.map(u => u.email),
    }),
  })

  return {
    ok: true,
    message: 'تم حذف جميع البيانات بنجاح (تم الاحتفاظ بـ ' + adminUsers.length + ' مسؤول)',
    preservedAdmins: adminUsers,
  }
}

/* ─── DATABASE STATS ─── */
export const getDatabaseStats = async () => {
  const [users, items, entities, employees, receptions, distributions, receptionItems, distributionItems, budgets, budgetExpenses] =
    await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.entity.count(),
      prisma.employee.count(),
      prisma.reception.count(),
      prisma.distribution.count(),
      prisma.receptionItem.count(),
      prisma.distributionItem.count(),
      prisma.budget.count(),
      prisma.budgetExpense.count(),
    ])
  return { users, items, entities, employees, receptions, distributions, receptionItems, distributionItems, budgets, budgetExpenses }
}
