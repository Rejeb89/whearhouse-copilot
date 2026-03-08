import prisma from '../config/database'

export const createLog = async (action: string, table: string, recordId?: number | null, userId?: number | null, securityUnit?: string | null) => {
  return prisma.log.create({
    data: {
      action,
      table,
      recordId,
      userId: userId || null,
      securityUnit: securityUnit ?? null,
    }
  })
}
