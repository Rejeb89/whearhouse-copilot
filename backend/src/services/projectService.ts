import prisma from '../config/database'

const entitySelect = { id: true, name: true, type: true, category: true }

export const listProjects = async (securityUnit?: string | null, entityId?: number) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  if (entityId)     where.entityId = entityId
  return prisma.project.findMany({
    where,
    include: { entity: { select: entitySelect } },
    orderBy: { createdAt: 'desc' },
  })
}

export const getProjectById = async (id: number, securityUnit?: string | null) => {
  const where: any = { id }
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.project.findFirst({
    where,
    include: { entity: { select: entitySelect } },
  })
}

export const createProject = async (data: any, securityUnit?: string | null) => {
  const { startDate, expectedEndDate, ...rest } = data
  return prisma.project.create({
    data: {
      ...rest,
      ...(startDate       ? { startDate:       new Date(startDate) }       : {}),
      ...(expectedEndDate ? { expectedEndDate: new Date(expectedEndDate) } : {}),
      securityUnit: securityUnit ?? null,
    },
    include: { entity: { select: entitySelect } },
  })
}

export const updateProject = async (id: number, data: any, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.project.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('المشروع غير موجود أو لا يمكنك تعديله')
  }
  const { startDate, expectedEndDate, ...rest } = data
  return prisma.project.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate       !== undefined ? { startDate:       startDate       ? new Date(startDate)       : null } : {}),
      ...(expectedEndDate !== undefined ? { expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null } : {}),
    },
    include: { entity: { select: entitySelect } },
  })
}

export const deleteProject = async (id: number, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.project.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('المشروع غير موجود أو لا يمكنك حذفه')
  }
  await prisma.project.delete({ where: { id } })
}

export const getProjectStats = async (securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  const [total, byStatus, byType] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.groupBy({ by: ['status'], where, _count: true }),
    prisma.project.groupBy({ by: ['type'],   where, _count: true }),
  ])
  return { total, byStatus, byType }
}
