import express from 'express'
import { z } from 'zod'
import * as userService from '../services/userService'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = express.Router()
router.use(authGuard, roleGuard(['ADMIN']))

const createSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  role: z.enum(['ADMIN', 'STORE_KEEPER', 'USER']).optional(),
  personalNumber: z.string().optional(),
  securityUnit: z.string().optional(),
  region: z.string().optional(),
  title: z.string().optional(),
})

const updateSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').optional(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').optional().or(z.literal('')),
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  role: z.enum(['ADMIN', 'STORE_KEEPER', 'USER']).optional(),
  personalNumber: z.string().optional(),
  securityUnit: z.string().optional(),
  region: z.string().optional(),
  title: z.string().optional(),
})

router.get('/', async (req, res) => {
  try {
    const search = (req.query.search as string) || undefined
    const role = (req.query.role as string) || undefined
    const users = await userService.listUsers(search, role)
    res.json({ data: users })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
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
})

router.get('/:id', async (req, res) => {
  try {
    const user = await userService.getUser(Number(req.params.id))
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' })
    res.json({ data: user })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
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
})

router.delete('/:id', async (req, res) => {
  try {
    const actor = (req as any).user
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    await userService.deleteUser(Number(req.params.id), actor?.email, actor?.id, ip)
    res.json({ data: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
