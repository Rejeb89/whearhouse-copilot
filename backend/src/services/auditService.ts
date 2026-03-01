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

export const listAuditLogs = (limit = 200) =>
  prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
