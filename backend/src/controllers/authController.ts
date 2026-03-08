import { Request, Response } from 'express'
import { login, register } from '../services/authService'
import prisma from '../config/database'
import { signToken } from '../utils/jwt'

export const registerUser = async (req: Request, res: Response) => {
  try {
    const user = await register(req.body)
    res.json({ data: { id: user.id, email: user.email } })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' })
    }
    const { user, token } = await login(email, password)
    res.json({
      data: {
        user: {
          id: user.id, email: user.email, role: user.role, name: user.name,
          personalNumber: user.personalNumber, securityUnit: user.securityUnit,
          region: user.region, title: user.title,
        },
        token,
      },
    })
  } catch (err: any) {
    console.error('[LOGIN FAILED] email:', req.body?.email, '| reason:', err.message)
    res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })
  }
}

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' })
    // Issue a fresh JWT so that any admin-side changes (role, securityUnit, etc.) take effect immediately
    const freshToken = signToken({ id: user.id, role: user.role, email: user.email, securityUnit: user.securityUnit, region: user.region })
    res.json({
      data: {
        id: user.id, email: user.email, role: user.role, name: user.name,
        personalNumber: user.personalNumber, securityUnit: user.securityUnit,
        region: user.region, title: user.title,
      },
      token: freshToken,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
