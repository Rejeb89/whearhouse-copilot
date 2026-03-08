import { Request, Response } from 'express'
import * as userService from '../services/userService'
import { createUserSchema, updateUserSchema } from '../validation'
import { humanizePrismaError } from '../utils/prismaError'
import prisma from '../config/database'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || undefined
    const role = (req.query.role as string) || undefined
    const users = await userService.listUsers(search, role, getSU(req))
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

    // SECTION_CHIEF can only create USER-role accounts inside their own unit
    let data = { ...parsed.data }
    if (actor?.role === 'SECTION_CHIEF') {
      if (data.role && data.role !== 'USER') {
        return res.status(403).json({ error: 'رئيس القسم يمكنه إنشاء مستخدمين من نوع "مستخدم" فقط' })
      }
      // Fetch actor's full profile to get region and title (not stored in JWT)
      const actorProfile = await prisma.user.findUnique({ where: { id: actor.id }, select: { securityUnit: true, region: true, title: true } })
      data.role = 'USER'
      data.securityUnit = actorProfile?.securityUnit?.trim() || actor.securityUnit?.trim() || data.securityUnit
      data.region = actorProfile?.region ?? data.region
      data.title = actorProfile?.title ?? data.title
    }

    const user = await userService.createUser(data, actor?.email, actor?.id, ip)
    res.json({ data: user })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUser(Number(req.params.id), getSU(req))
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
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    await userService.deleteUser(Number(req.params.id), actor?.email, actor?.id, ip)
    res.json({ data: true })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}
