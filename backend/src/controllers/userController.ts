import { Request, Response } from 'express'
import * as userService from '../services/userService'
import { createUserSchema, updateUserSchema } from '../validation'

export const list = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || undefined
    const role = (req.query.role as string) || undefined
    const users = await userService.listUsers(search, role)
    res.json({ data: users })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const create = async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }
  try {
    const actor = (req as any).user
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    const user = await userService.createUser(parsed.data, actor?.email, actor?.id, ip)
    res.json({ data: user })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUser(Number(req.params.id))
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' })
    res.json({ data: user })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const update = async (req: Request, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }
  try {
    const actor = (req as any).user
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    const data = { ...parsed.data }
    if (data.password === '') delete data.password
    const updated = await userService.updateUser(Number(req.params.id), data, actor?.email, actor?.id, ip)
    res.json({ data: updated })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    await userService.deleteUser(Number(req.params.id), actor?.email, actor?.id, ip)
    res.json({ data: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
