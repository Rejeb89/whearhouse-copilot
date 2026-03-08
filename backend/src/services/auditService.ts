import prisma from '../config/database'

export interface AuditParams {
  action: string
  entity: string
  entityId?: number | null
  actorEmail?: string | null
  actorId?: number | null
  details?: string | null
  ip?: string | null
}

export const createAuditLog = (params: AuditParams) =>
  prisma.auditLog.create({ data: params })

export const listAuditLogs = async (limit = 200, securityUnit?: string | null) => {
  if (!securityUnit) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
  // Filter: only show audit logs created by users in the same securityUnit
  const users = await prisma.user.findMany({ where: { securityUnit }, select: { id: true } })
  const userIds = users.map(u => u.id)
  return prisma.auditLog.findMany({
    where: { actorId: { in: userIds } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
