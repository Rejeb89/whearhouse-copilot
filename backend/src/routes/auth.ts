import express from 'express'
import { login, register } from '../services/authService'

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
    res.json({ data: { user: { id: user.id, email: user.email, role: user.role, name: user.name, personalNumber: user.personalNumber, securityUnit: user.securityUnit }, token } })
  } catch (err: any) {
    console.error('[LOGIN FAILED] email:', req.body?.email, '| reason:', err.message)
    res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })
  }
})

export default router
