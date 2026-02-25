import express from 'express'
import { login, register } from '../services/authService'
import { authGuard } from '../middleware/authGuard'
import prisma from '../prisma'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const user = await register(req.body)
    res.json({ data: { id: user.id, email: user.email } })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' })
    }
    const { user, token } = await login(email, password)
    res.json({ data: { user: { id: user.id, email: user.email, role: user.role, name: user.name, personalNumber: user.personalNumber, securityUnit: user.securityUnit, region: user.region, title: user.title }, token } })
  } catch (err: any) {
    console.error('[LOGIN FAILED] email:', req.body?.email, '| reason:', err.message)
    res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })
  }
})

router.get('/me', authGuard, async (req, res) => {
  try {
    const userId = (req as any).user?.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' })
    res.json({ data: { id: user.id, email: user.email, role: user.role, name: user.name, personalNumber: user.personalNumber, securityUnit: user.securityUnit, region: user.region, title: user.title } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
