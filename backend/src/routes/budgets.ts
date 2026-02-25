import express from 'express'
import prisma from '../prisma'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = express.Router()
router.use(authGuard)

/* ─── GET /api/budgets ─── list all budgets with spent sums ─── */
router.get('/', async (_req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        expenses: { select: { amount: true } },
      },
    })
    const result = budgets.map(b => ({
      ...b,
      spent: b.expenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0),
      expenses: undefined,
    }))
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── POST /api/budgets ─── create budget (ADMIN only) ─── */
router.post('/', roleGuard(['ADMIN']), async (req, res) => {
  const { name, department, amount, startDate, endDate, status, notes } = req.body
  if (!name || !department || !amount || !startDate || !endDate) {
    return res.status(400).json({ error: 'الحقول المطلوبة: name, department, amount, startDate, endDate' })
  }
  try {
    const actor = (req as any).user
    const budget = await prisma.budget.create({
      data: { name, department, amount: Number(amount), startDate, endDate, status: status ?? 'active', notes, createdBy: actor?.email ?? '' },
    })
    res.json({ data: budget })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── PUT /api/budgets/:id ─── update budget (ADMIN only) ─── */
router.put('/:id', roleGuard(['ADMIN']), async (req, res) => {
  const id = Number(req.params.id)
  const { name, department, amount, startDate, endDate, status, notes } = req.body
  try {
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    })
    res.json({ data: budget })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── GET /api/budgets/expenses/by-supplier/:name ─── expenses for a supplier entity ─── */
router.get('/expenses/by-supplier/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name)
    const expenses = await prisma.budgetExpense.findMany({
      where: { supplier: { equals: name, mode: 'insensitive' } },
      include: { budget: { select: { id: true, name: true, startDate: true } } },
      orderBy: { date: 'desc' },
    })
    res.json({ data: expenses.map(e => ({ ...e, attachments: JSON.parse(e.attachments || '[]') })) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── GET /api/budgets/supply-requests/by-supplier/:name ─── supply requests for a supplier entity ─── */
router.get('/supply-requests/by-supplier/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name)
    const requests = await prisma.supplyRequest.findMany({
      where: { supplier: { equals: name, mode: 'insensitive' } },
      include: { budget: { select: { id: true, name: true, startDate: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: requests.map(r => ({ ...r, attachments: JSON.parse(r.attachments || '[]') })) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── DELETE /api/budgets/:id ─── delete budget + cascade expenses (ADMIN only) ─── */
router.delete('/:id', roleGuard(['ADMIN']), async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.budgetExpense.deleteMany({ where: { budgetId: id } })
    await prisma.budget.delete({ where: { id } })
    res.json({ data: { ok: true } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── GET /api/budgets/:id/expenses ─── list expenses for a budget ─── */
router.get('/:id/expenses', async (req, res) => {
  const budgetId = Number(req.params.id)
  try {
    const expenses = await prisma.budgetExpense.findMany({
      where: { budgetId },
      orderBy: { addedAt: 'desc' },
    })
    const result = expenses.map(e => ({ ...e, attachments: (() => { try { return JSON.parse(e.attachments) } catch { return [] } })() }))
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── POST /api/budgets/:id/expenses ─── add expense (ADMIN only) ─── */
router.post('/:id/expenses', roleGuard(['ADMIN']), async (req, res) => {
  const budgetId = Number(req.params.id)
  const { date, supplier, invoiceNumber, amount, notes, attachments } = req.body
  if (!date || !supplier || !amount) {
    return res.status(400).json({ error: 'الحقول المطلوبة: date, supplier, amount' })
  }
  try {
    const actor = (req as any).user
    const expense = await prisma.budgetExpense.create({
      data: {
        budgetId,
        date,
        supplier,
        invoiceNumber: invoiceNumber ?? null,
        amount: Number(amount),
        notes: notes ?? null,
        attachments: Array.isArray(attachments) ? JSON.stringify(attachments) : '[]',
        addedBy: actor?.email ?? '',
      },
    })
    // Return with parsed attachments
    res.json({ data: { ...expense, attachments: JSON.parse(expense.attachments) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── DELETE /api/budgets/expenses/:id ─── delete expense (ADMIN only) ─── */
router.delete('/expenses/:id', roleGuard(['ADMIN']), async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.budgetExpense.delete({ where: { id } })
    res.json({ data: { ok: true } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── GET /api/budgets/:id/supply-requests ─── */
router.get('/:id/supply-requests', async (req, res) => {
  const budgetId = Number(req.params.id)
  try {
    const requests = await prisma.supplyRequest.findMany({
      where: { budgetId },
      orderBy: { createdAt: 'desc' },
    })
    const result = requests.map(r => ({
      ...r,
      attachments: (() => { try { return JSON.parse(r.attachments) } catch { return [] } })(),
    }))
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── POST /api/budgets/:id/supply-requests ─── */
router.post('/:id/supply-requests', async (req, res) => {
  const budgetId = Number(req.params.id)
  const { title, notes, attachments, supplier } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  try {
    const actor = (req as any).user
    const request = await prisma.supplyRequest.create({
      data: {
        budgetId,
        title,
        supplier: supplier ?? null,
        notes: notes ?? null,
        attachments: Array.isArray(attachments) ? JSON.stringify(attachments) : '[]',
        createdBy: actor?.email ?? '',
      },
    })
    res.json({ data: { ...request, attachments: JSON.parse(request.attachments) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── DELETE /api/budgets/supply-requests/:id ─── (ADMIN only) ─── */
router.delete('/supply-requests/:id', roleGuard(['ADMIN']), async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.supplyRequest.delete({ where: { id } })
    res.json({ data: { ok: true } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
