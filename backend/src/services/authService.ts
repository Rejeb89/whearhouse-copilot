import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/hash'
import { signToken } from '../utils/jwt'
import { createLog } from './logService'

export const register = async (data: { email: string; password: string; name?: string; role?: string }) => {
  const pw = await hashPassword(data.password)
  const user = await prisma.user.create({ data: { email: data.email, password: pw, name: data.name, role: (data.role as any) || 'USER' } })
  await createLog('CREATE', 'User', user.id, user.id)
  return user
}

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('Invalid credentials')
  const ok = await comparePassword(password, user.password)
  if (!ok) throw new Error('Invalid credentials')
  if (user.blocked) throw new Error('الحساب موقوف، تواصل مع المسؤول')
  const token = signToken({ id: user.id, role: user.role, email: user.email, securityUnit: user.securityUnit, region: user.region })
  await createLog('LOGIN', 'User', user.id, user.id)
  return { user, token }
}
