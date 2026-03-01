import prisma from '../config/database'

export const createLog = async (action: string, table: string, recordId?: number | null, userId?: number | null) => {
  return prisma.log.create({
    data: {
      action,
      table,
      recordId,
      userId: userId || null
    }
  })
}
