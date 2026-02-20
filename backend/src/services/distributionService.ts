import prisma from '../prisma'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'

export const createDistribution = async (
  userId: number,
  reference: string,
  items: { itemId: number; quantity: number }[],
  beneficiaryId?: number,
  assignedToId?: number,
  notes?: string
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const distribution = await tx.distribution.create({
      data: { reference, userId, beneficiaryId, assignedToId: assignedToId ?? null, notes: notes ?? null }
    })
    for (const it of items) {
      const item = await tx.item.findUnique({ where: { id: it.itemId } })
      if (!item) throw new Error('Item not found')
      if (item.quantity - it.quantity < 0) throw new Error('Insufficient stock')
      await tx.distributionItem.create({ data: { distributionId: distribution.id, itemId: it.itemId, quantity: it.quantity } })
      await tx.item.update({ where: { id: it.itemId }, data: { quantity: { decrement: it.quantity } } })
    }
    await createLog('CREATE', 'Distribution', distribution.id, userId)
    return distribution
  })
}

export const recentDistributions = (limit = 10) => prisma.distribution.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { items: true } })

export const getDistributionsByEntity = async (beneficiaryId: number) => {
  return prisma.distribution.findMany({
    where: { beneficiaryId },
    include: {
      items: {
        include: {
          item: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
