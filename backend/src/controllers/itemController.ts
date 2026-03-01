import { Request, Response } from 'express'
import * as itemService from '../services/itemService'

export const inventory = async (_req: Request, res: Response) => {
  try {
    const data = await itemService.getInventorySummary()
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const list = async (_req: Request, res: Response) => {
  const items = await itemService.listItems()
  res.json({ data: items })
}

export const create = async (req: Request, res: Response) => {
  try {
    const item = await itemService.createItem(req.body)
    res.json({ data: item })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const update = async (req: Request, res: Response) => {
  const updated = await itemService.updateItem(Number(req.params.id), req.body)
  res.json({ data: updated })
}

export const remove = async (req: Request, res: Response) => {
  try {
    await itemService.deleteItem(Number(req.params.id))
    res.json({ data: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const adminNumbers = async (req: Request, res: Response) => {
  try {
    const numbers = await itemService.getItemAdminNumbers(Number(req.params.id))
    res.json({ data: numbers })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const history = async (req: Request, res: Response) => {
  try {
    const data = await itemService.getItemHistory(Number(req.params.id))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
