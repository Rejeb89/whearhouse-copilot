import prisma from '../prisma'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'
import { createReceiptForDistribution } from './receiptService'

export const createDistribution = async (
  userId: number,
  reference: string,
  items: { itemId: number; quantity: number; serialNumber?: string; condition?: string; notes?: string }[],
  beneficiaryId?: number,
  assignedToId?: number,
  notes?: string,
  referenceType?: string,
  referenceNumber?: string,
  referenceDate?: string,
  deliveredByName?: string
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const distribution = await tx.distribution.create({
      data: {
        reference,
        userId,
        beneficiaryId,
        assignedToId: assignedToId ?? null,
        notes: notes ?? null,
        referenceType: referenceType ?? null,
        referenceNumber: referenceNumber ?? null,
        referenceDate: referenceDate ? new Date(referenceDate) : null,
        deliveredByName: deliveredByName ?? null,
      }
    })
    for (const it of items) {
      const item = await tx.item.findUnique({ where: { id: it.itemId } })
      if (!item) throw new Error('Item not found')
      if (item.quantity - it.quantity < 0) throw new Error('Insufficient stock')
      await tx.distributionItem.create({
        data: {
          distributionId: distribution.id,
          itemId: it.itemId,
          quantity: it.quantity,
          serialNumber: it.serialNumber ?? null,
          condition: (it.condition as any) ?? 'NEW',
          notes: it.notes ?? null,
        }
      })
      await tx.item.update({ where: { id: it.itemId }, data: { quantity: { decrement: it.quantity } } })
    }
    await createLog('CREATE', 'Distribution', distribution.id, userId)
    return distribution
  }).then(async (distribution) => {
    // Auto-create receipt after transaction commits
    try {
      await createReceiptForDistribution(distribution.id, userId)
    } catch (e) {
      console.error('Failed to create receipt:', e)
    }
    return distribution
  })
}

export const recentDistributions = (limit = 10) => prisma.distribution.findMany({ 
  orderBy: { createdAt: 'desc' }, 
  take: limit, 
  include: { 
    items: {
      include: { item: true }
    },
    beneficiary: { select: { id: true, name: true } }
  } 
})

export const getDistributionsByItem = async (itemId: number) => {
  return prisma.distributionItem.findMany({
    where: { itemId },
    include: {
      distribution: {
        include: {
          user: { select: { id: true, email: true, name: true } },
          beneficiary: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, surname: true, rank: true } },
        },
      },
    },
    orderBy: { distribution: { createdAt: 'desc' } },
  })
}

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
      assignedTo: {
        select: {
          id: true,
          rank: true,
          name: true,
          surname: true,
        },
      },
      receipt: {
        select: {
          id: true,
          serialNumber: true,
          status: true,
          issuedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
