import { Request, Response } from 'express'
import * as itemService from '../services/itemService'
import { humanizePrismaError } from '../utils/prismaError'

/** ADMIN sees all data; other users are scoped to their securityUnit */
const UNRESTRICTED_ROLES = ['ADMIN', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']
const getSU = (req: Request) => {
  const u = (req as any).user
  return UNRESTRICTED_ROLES.includes(u?.role) ? undefined : (u?.securityUnit ?? undefined)
}

export const inventory = async (req: Request, res: Response) => {
  try {
    const data = await itemService.getInventorySummary(getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const list = async (req: Request, res: Response) => {
  const items = await itemService.listItems(getSU(req))
  res.json({ data: items })
}

export const create = async (req: Request, res: Response) => {
  try {
    const su = (req as any).user?.securityUnit ?? null
    const item = await itemService.createItem(req.body, su)
    res.json({ data: item })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const updated = await itemService.updateItem(Number(req.params.id), req.body, getSU(req))
    res.json({ data: updated })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await itemService.deleteItem(Number(req.params.id), getSU(req))
    res.json({ data: true })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const adminNumbers = async (req: Request, res: Response) => {
  try {
    const numbers = await itemService.getItemAdminNumbers(Number(req.params.id), getSU(req))
    res.json({ data: numbers })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const history = async (req: Request, res: Response) => {
  try {
    const data = await itemService.getItemHistory(Number(req.params.id), getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
