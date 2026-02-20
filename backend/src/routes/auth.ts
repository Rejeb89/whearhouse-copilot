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
    const { user, token } = await login(email, password)
    res.json({ data: { user: { id: user.id, email: user.email, role: user.role, name: user.name }, token } })
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
})

export default router
