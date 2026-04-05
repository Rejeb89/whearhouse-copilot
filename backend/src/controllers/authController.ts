import { Request, Response } from 'express'
import { login, register } from '../services/authService'
import prisma from '../config/database'
import { signToken } from '../utils/jwt'
import { loginSchema } from '../validation'

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
    // Validate input
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => e.message).join(', ')
      return res.status(400).json({ error: errors })
    }

    const { email, password } = parsed.data
    const { user, token } = await login(email, password)
    res.json({
      data: {
        user: {
          id: user.id, email: user.email, role: user.role, name: user.name,
          personalNumber: user.personalNumber, securityUnit: user.securityUnit,
          region: user.region, regionChief: user.regionChief, title: user.title,
        },
        token,
      },
    })
  } catch (err: any) {
    console.error('[LOGIN FAILED] email:', req.body?.email, '| reason:', err.message)
    
    // معالجة الأخطاء المختلفة وإرسال رسائل مناسبة
    let statusCode = 401
    let errorMessage = err.message
    
    // معالجة الأخطاء بشكل ودي
    if (err.message.includes('🔒')) {
      statusCode = 403
      errorMessage = err.message
    } else if (err.message.includes('❌')) {
      errorMessage = err.message
    }
    
    res.status(statusCode).json({ error: errorMessage })
  }
}

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: '👤 لم نتمكن من العثور على بيانات حسابك' })
    // Issue a fresh JWT so that any admin-side changes (role, securityUnit, etc.) take effect immediately
    const freshToken = signToken({ id: user.id, role: user.role, email: user.email, securityUnit: user.securityUnit, region: user.region })
    res.json({
      data: {
        id: user.id, email: user.email, role: user.role, name: user.name,
        personalNumber: user.personalNumber, securityUnit: user.securityUnit,
        region: user.region, regionChief: (user as any).regionChief, title: user.title,
      },
      token: freshToken,
    })
  } catch (err: any) {
    res.status(500).json({ error: '⚠️ حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.' })
  }
}
