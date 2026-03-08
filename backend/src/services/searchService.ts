import prisma from '../config/database'

export const globalSearch = async (q: string, securityUnit?: string | null) => {
  if (!q || q.length < 2) {
    return { items: [], receptions: [], distributions: [], entities: [], employees: [], users: [] }
  }

  const suFilter: any = securityUnit ? { securityUnit } : {}

  const [items, receptions, distributions, entities, employees, users] = await Promise.all([
    // Search Items
    prisma.item.findMany({
      where: {
        ...suFilter,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, sku: true, quantity: true },
      take: 10,
    }),

    // Search Receptions
    prisma.reception.findMany({
      where: {
        ...suFilter,
        OR: [
          { reference: { contains: q, mode: 'insensitive' } },
          { referenceNumber: { contains: q, mode: 'insensitive' } },
          { referenceType: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { supplier: { name: { contains: q, mode: 'insensitive' } } },
          { supplier: { phone: { contains: q, mode: 'insensitive' } } },
          { collector: { name: { contains: q, mode: 'insensitive' } } },
          { collector: { surname: { contains: q, mode: 'insensitive' } } },
          { collector: { rank: { contains: q, mode: 'insensitive' } } },
          { collector: { number: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: {
        supplier: { select: { name: true } },
        user: { select: { email: true, name: true } },
        _count: { select: { items: true } },
      },
      take: 10,
    }),

    // Search Distributions
    prisma.distribution.findMany({
      where: {
        ...suFilter,
        OR: [
          { reference: { contains: q, mode: 'insensitive' } },
          { referenceNumber: { contains: q, mode: 'insensitive' } },
          { referenceType: { contains: q, mode: 'insensitive' } },
          { deliveredByName: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { beneficiary: { name: { contains: q, mode: 'insensitive' } } },
          { beneficiary: { phone: { contains: q, mode: 'insensitive' } } },
          { assignedTo: { name: { contains: q, mode: 'insensitive' } } },
          { assignedTo: { surname: { contains: q, mode: 'insensitive' } } },
          { assignedTo: { rank: { contains: q, mode: 'insensitive' } } },
          { assignedTo: { number: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: {
        beneficiary: { select: { name: true } },
        assignedTo: { select: { name: true, surname: true, rank: true } },
        user: { select: { email: true, name: true } },
        _count: { select: { items: true } },
      },
      take: 10,
    }),

    // Search Entities
    prisma.entity.findMany({
      where: {
        ...suFilter,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { unitHead: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, type: true, phone: true },
      take: 10,
    }),

    // Search Employees
    prisma.employee.findMany({
      where: {
        ...(securityUnit ? { entity: { securityUnit } } : {}),
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { surname: { contains: q, mode: 'insensitive' } },
          { number: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { rank: { contains: q, mode: 'insensitive' } },
          { entity: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { entity: { select: { name: true } } },
      take: 10,
    }),

    // Search Users
    prisma.user.findMany({
      where: {
        ...(securityUnit ? { securityUnit } : {}),
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true, role: true },
      take: 10,
    }),
  ])

  return {
    items: items.map((i: any) => ({ ...i, type: 'item' })),
    receptions: receptions.map((r: any) => ({ ...r, type: 'reception' })),
    distributions: distributions.map((d: any) => ({ ...d, type: 'distribution' })),
    entities: entities.map((e: any) => ({ ...e, type: 'entity' })),
    employees: employees.map((e: any) => ({ ...e, type: 'employee' })),
    users: users.map((u: any) => ({ ...u, type: 'user' })),
  }
}
