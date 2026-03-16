import prisma from '../config/database'
import { hashPassword } from '../utils/hash'
import { createLog } from './logService'
import { createAuditLog } from './auditService'

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  personalNumber: true,
  securityUnit: true,
  region: true,
  regionChief: true,
  title: true,
  createdAt: true,
}

export const listUsers = (search?: string, role?: string, securityUnit?: string | null, excludeRoles?: string[]) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (role) {
    where.role = excludeRoles && excludeRoles.length > 0
      ? { equals: role, notIn: excludeRoles }
      : role
  } else if (excludeRoles && excludeRoles.length > 0) {
    where.role = { notIn: excludeRoles }
  }
  return prisma.user.findMany({ where, select: SAFE_SELECT, orderBy: { createdAt: 'desc' } })
}

export const getUser = (id: number, securityUnit?: string | null, excludeRoles?: string[]) => {
  const where: any = { id }
  if (securityUnit) where.securityUnit = securityUnit
  if (excludeRoles && excludeRoles.length > 0) where.role = { notIn: excludeRoles }
  return prisma.user.findFirst({ where, select: SAFE_SELECT })
}

export const createUser = async (
  data: { email: string; password: string; name?: string; role?: string; personalNumber?: string; securityUnit?: string; region?: string; regionChief?: string; title?: string },
  actorEmail?: string,
  actorId?: number,
  ip?: string,
) => {
  const pw = await hashPassword(data.password)
  const user = await prisma.user.create({
    data: { email: data.email, password: pw, name: data.name, role: (data.role as any) || 'USER', personalNumber: data.personalNumber, securityUnit: data.securityUnit?.trim() || null, region: data.region, regionChief: data.regionChief, title: data.title },
    select: SAFE_SELECT,
  })
  await createLog('CREATE', 'User', user.id, actorId ?? null)
  await createAuditLog({
    action: 'CREATE_USER',
    entity: 'User',
    entityId: user.id,
    actorEmail: actorEmail ?? null,
    actorId: actorId ?? null,
    details: JSON.stringify({ email: user.email, role: user.role }),
    ip: ip ?? null,
  })
  return user
}

export const updateUser = async (
  id: number,
  data: { email?: string; password?: string; name?: string; role?: string; personalNumber?: string; securityUnit?: string; region?: string; regionChief?: string; title?: string },
  actorEmail?: string,
  actorId?: number,
  ip?: string,
) => {
  const payload: any = { ...data }
  if (payload.securityUnit !== undefined) payload.securityUnit = payload.securityUnit?.trim() || null
  if (data.password) payload.password = await hashPassword(data.password)
  else delete payload.password
  const user = await prisma.user.update({ where: { id }, data: payload, select: SAFE_SELECT })
  await createLog('UPDATE', 'User', user.id, actorId ?? null)
  await createAuditLog({
    action: 'UPDATE_USER',
    entity: 'User',
    entityId: user.id,
    actorEmail: actorEmail ?? null,
    actorId: actorId ?? null,
    details: JSON.stringify({ updatedFields: Object.keys(data).filter((k) => k !== 'password') }),
    ip: ip ?? null,
  })
  return user
}

export const deleteUser = async (
  id: number,
  actorEmail?: string,
  actorId?: number,
  ip?: string,
) => {
  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (targetUser?.role === 'ADMIN') {
    throw new Error('لا يمكن حذف حساب المسؤول، يمكن التعديل عليه فقط')
  }
  await prisma.user.delete({ where: { id } })
  await createLog('DELETE', 'User', id, actorId ?? null)
  await createAuditLog({
    action: 'DELETE_USER',
    entity: 'User',
    entityId: id,
    actorEmail: actorEmail ?? null,
    actorId: actorId ?? null,
    details: JSON.stringify({ deletedUserId: id, deletedEmail: targetUser?.email }),
    ip: ip ?? null,
  })
  return true
}
