import prisma from '../config/database'

/* ─── List all budgets with spent sums ─── */
export const listBudgets = async (securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  const budgets = await prisma.budget.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      expenses: { select: { amount: true } },
    },
  })
  return budgets.map(b => ({
    ...b,
    spent: b.expenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0),
    expenses: undefined,
  }))
}

/* ─── Create budget ─── */
export const createBudget = async (
  data: { name: string; department: string; amount: number; startDate: string; endDate: string; status?: string; notes?: string },
  actorEmail?: string,
  securityUnit?: string | null,
) => {
  return prisma.budget.create({
    data: {
      name: data.name,
      department: data.department,
      amount: Number(data.amount),
      startDate: data.startDate,
      endDate: data.endDate,
      status: (data.status as any) ?? 'active',
      notes: data.notes,
      createdBy: actorEmail ?? '',
      securityUnit: securityUnit ?? null,
    },
  })
}

/* ─── Update budget ─── */
export const updateBudget = async (
  id: number,
  data: { name?: string; department?: string; amount?: number; startDate?: string; endDate?: string; status?: string; notes?: string },
  securityUnit?: string | null,
) => {
  if (securityUnit) {
    const existing = await prisma.budget.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('الميزانية غير موجودة أو لا يمكنك تعديلها')
  }
  return prisma.budget.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.department !== undefined && { department: data.department }),
      ...(data.amount !== undefined && { amount: Number(data.amount) }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.endDate !== undefined && { endDate: data.endDate }),
      ...(data.status !== undefined && { status: data.status as any }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  })
}

/* ─── Delete budget + cascade ─── */
export const deleteBudget = async (id: number, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.budget.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('الميزانية غير موجودة أو لا يمكنك حذفها')
  }
  await prisma.budgetExpense.deleteMany({ where: { budgetId: id } })
  await prisma.budget.delete({ where: { id } })
}

/* ─── Expenses ─── */
export const listExpenses = async (budgetId: number) => {
  const expenses = await prisma.budgetExpense.findMany({
    where: { budgetId },
    orderBy: { addedAt: 'desc' },
  })
  return expenses.map(e => ({
    ...e,
    attachments: (() => { try { return JSON.parse(e.attachments) } catch { return [] } })(),
  }))
}

export const createExpense = async (
  budgetId: number,
  data: { date: string; supplier: string; invoiceNumber?: string; amount: number; notes?: string; attachments?: any[] },
  actorEmail?: string,
) => {
  const expense = await prisma.budgetExpense.create({
    data: {
      budgetId,
      date: data.date,
      supplier: data.supplier,
      invoiceNumber: data.invoiceNumber ?? null,
      amount: Number(data.amount),
      notes: data.notes ?? null,
      attachments: Array.isArray(data.attachments) ? JSON.stringify(data.attachments) : '[]',
      addedBy: actorEmail ?? '',
    },
  })
  return { ...expense, attachments: JSON.parse(expense.attachments) }
}

export const deleteExpense = async (id: number) => {
  await prisma.budgetExpense.delete({ where: { id } })
}

export const getExpensesBySupplier = async (name: string, securityUnit?: string | null) => {
  const where: any = { supplier: { equals: name, mode: 'insensitive' } }
  if (securityUnit) where.budget = { securityUnit }
  const expenses = await prisma.budgetExpense.findMany({
    where,
    include: { budget: { select: { id: true, name: true, startDate: true } } },
    orderBy: { date: 'desc' },
  })
  return expenses.map(e => ({ ...e, attachments: JSON.parse(e.attachments || '[]') }))
}

/* ─── Supply Requests ─── */
export const listSupplyRequests = async (budgetId: number) => {
  const requests = await prisma.supplyRequest.findMany({
    where: { budgetId },
    orderBy: { createdAt: 'desc' },
  })
  return requests.map(r => ({
    ...r,
    attachments: (() => { try { return JSON.parse(r.attachments) } catch { return [] } })(),
  }))
}

export const createSupplyRequest = async (
  budgetId: number,
  data: { title: string; notes?: string; attachments?: any[]; supplier?: string },
  actorEmail?: string,
) => {
  const request = await prisma.supplyRequest.create({
    data: {
      budgetId,
      title: data.title,
      supplier: data.supplier ?? null,
      notes: data.notes ?? null,
      attachments: Array.isArray(data.attachments) ? JSON.stringify(data.attachments) : '[]',
      createdBy: actorEmail ?? '',
    },
  })
  return { ...request, attachments: JSON.parse(request.attachments) }
}

export const deleteSupplyRequest = async (id: number) => {
  await prisma.supplyRequest.delete({ where: { id } })
}

export const getSupplyRequestsBySupplier = async (name: string, securityUnit?: string | null) => {
  const where: any = { supplier: { equals: name, mode: 'insensitive' } }
  if (securityUnit) where.budget = { securityUnit }
  const requests = await prisma.supplyRequest.findMany({
    where,
    include: { budget: { select: { id: true, name: true, startDate: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return requests.map(r => ({ ...r, attachments: JSON.parse(r.attachments || '[]') }))
}
