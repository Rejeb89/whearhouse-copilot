import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/hash'
import { signToken } from '../utils/jwt'
import { createLog } from './logService'

export const register = async (data: { email: string; password: string; name?: string; role?: string }) => {
  const pw = await hashPassword(data.password)
  const allowedRoles = ['USER', 'ADMIN', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER', 'SECURITY_UNIT_CHIEF']
  const role = (data.role && allowedRoles.includes(data.role)) ? data.role : 'USER'
  const email = data.email.trim().toLowerCase()
  const user = await prisma.user.create({ data: { email, password: pw, name: data.name, role: role as any } })
  await createLog('CREATE', 'User', user.id, user.id)
  return user
}

export const login = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  
  if (!user) {
    throw new Error('❌ هذا البريد الإلكتروني غير مسجل، تحقق من البيانات')
  }
  
  const ok = await comparePassword(password, user.password)
  if (!ok) {
    throw new Error('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }
  
  if (user.blocked) {
    throw new Error('🔒 حسابك معطل مؤقتاً. تواصل مع فريق الدعم للمساعدة')
  }
  
  const token = signToken({ id: user.id, role: user.role, email: user.email, securityUnit: user.securityUnit, region: user.region })
  await createLog('LOGIN', 'User', user.id, user.id)
  return { user, token }
}
