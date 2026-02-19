import prisma from '../prisma'
import { hashPassword } from '../utils/hash'
import { createLog } from './logService'

export const listUsers = () => prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } })

export const getUser = (id: number) => prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } })

export const createUser = async (data: { email: string; password: string; name?: string; role?: string }) => {
  const pw = await hashPassword(data.password)
  const user = await prisma.user.create({ data: { email: data.email, password: pw, name: data.name, role: (data.role as any) || 'USER' } })
  await createLog('CREATE', 'User', user.id, (user.id))
  return user
}

export const updateUser = async (id: number, data: { email?: string; password?: string; name?: string; role?: string }) => {
  const payload: any = { ...data }
  if (data.password) payload.password = await hashPassword(data.password)
  const user = await prisma.user.update({ where: { id }, data: payload })
  await createLog('UPDATE', 'User', user.id, user.id)
  return user
}

export const deleteUser = async (id: number) => {
  await prisma.user.delete({ where: { id } })
  await createLog('DELETE', 'User', id, null)
  return true
}
