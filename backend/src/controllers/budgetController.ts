import { Request, Response } from 'express'
import * as budgetService from '../services/budgetService'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const data = await budgetService.listBudgets(getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const create = async (req: Request, res: Response) => {
  const { name, department, amount, startDate, endDate, status, notes } = req.body
  if (!name || !department || !amount || !startDate || !endDate) {
    return res.status(400).json({ error: 'الحقول المطلوبة: name, department, amount, startDate, endDate' })
  }
  try {
    const actor = (req as any).user
    const budget = await budgetService.createBudget(
      { name, department, amount, startDate, endDate, status, notes }, actor?.email, actor?.securityUnit,
    )
    res.json({ data: budget })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const budget = await budgetService.updateBudget(Number(req.params.id), req.body, getSU(req))
    res.json({ data: budget })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await budgetService.deleteBudget(Number(req.params.id), getSU(req))
    res.json({ data: { ok: true } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const listExpenses = async (req: Request, res: Response) => {
  try {
    const data = await budgetService.listExpenses(Number(req.params.id))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const createExpense = async (req: Request, res: Response) => {
  const { date, supplier, invoiceNumber, amount, notes, attachments } = req.body
  if (!date || !supplier || !amount) {
    return res.status(400).json({ error: 'الحقول المطلوبة: date, supplier, amount' })
  }
  try {
    const actor = (req as any).user
    const expense = await budgetService.createExpense(
      Number(req.params.id), { date, supplier, invoiceNumber, amount, notes, attachments }, actor?.email,
    )
    res.json({ data: expense })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    await budgetService.deleteExpense(Number(req.params.id))
    res.json({ data: { ok: true } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const expensesBySupplier = async (req: Request, res: Response) => {
  try {
    const name = decodeURIComponent(req.params.name)
    const data = await budgetService.getExpensesBySupplier(name, getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const listSupplyRequests = async (req: Request, res: Response) => {
  try {
    const data = await budgetService.listSupplyRequests(Number(req.params.id))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const createSupplyRequest = async (req: Request, res: Response) => {
  const { title, notes, attachments, supplier } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  try {
    const actor = (req as any).user
    const request = await budgetService.createSupplyRequest(
      Number(req.params.id), { title, notes, attachments, supplier }, actor?.email,
    )
    res.json({ data: request })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteSupplyRequest = async (req: Request, res: Response) => {
  try {
    await budgetService.deleteSupplyRequest(Number(req.params.id))
    res.json({ data: { ok: true } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const supplyRequestsBySupplier = async (req: Request, res: Response) => {
  try {
    const name = decodeURIComponent(req.params.name)
    const data = await budgetService.getSupplyRequestsBySupplier(name, getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
