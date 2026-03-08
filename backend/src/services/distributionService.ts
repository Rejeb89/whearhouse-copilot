import prisma from '../config/database'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'
import { createReceiptForDistribution } from './receiptService'

export const createDistribution = async (
  userId: number,
  reference: string,
  items: { itemId: number; quantity: number; serialNumber?: string; adminNumber?: string; condition?: string; notes?: string }[],
  beneficiaryId?: number,
  assignedToId?: number,
  notes?: string,
  referenceType?: string,
  referenceNumber?: string,
  referenceDate?: string,
  deliveredByName?: string,
  securityUnit?: string | null,
) => {
  return prisma.$transaction(async (tx) => {
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
        securityUnit: securityUnit ?? null,
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
          adminNumber: it.adminNumber ?? null,
          condition: (it.condition as any) ?? 'NEW',
          notes: it.notes ?? null,
        }
      })
      await tx.item.update({ where: { id: it.itemId }, data: { quantity: { decrement: it.quantity } } })
    }
    await createLog('CREATE', 'Distribution', distribution.id, userId, securityUnit)
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

export const recentDistributions = (limit = 10, securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.distribution.findMany({ 
    where,
    orderBy: { createdAt: 'desc' }, 
    take: limit, 
    include: { 
      items: {
        include: { item: true }
      },
      beneficiary: { select: { id: true, name: true } }
    } 
  })
}

export const getDistributionsByItem = async (itemId: number, securityUnit?: string | null) => {
  const where: any = { itemId }
  if (securityUnit) where.distribution = { securityUnit }
  return prisma.distributionItem.findMany({
    where,
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

export const getAllDistributions = async (filters?: { search?: string; referenceType?: string; dateFrom?: string; dateTo?: string }, securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  if (filters?.referenceType) where.referenceType = filters.referenceType
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      where.createdAt.lte = to
    }
  }
  const list = await prisma.distribution.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { item: true } },
      beneficiary: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, rank: true, name: true, surname: true, number: true } },
    }
  })
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    return list.filter((d: any) =>
      (d.items || []).some((di: any) => di.item?.name?.toLowerCase().includes(q)) ||
      (d.referenceNumber || '').toLowerCase().includes(q) ||
      (d.referenceType || '').toLowerCase().includes(q) ||
      (d.beneficiary?.name || '').toLowerCase().includes(q) ||
      (d.assignedTo ? `${d.assignedTo.rank} ${d.assignedTo.name} ${d.assignedTo.surname}`.toLowerCase().includes(q) : false)
    )
  }
  return list
}

export const getDistributionsByEntity = async (beneficiaryId: number, securityUnit?: string | null) => {
  const where: any = { beneficiaryId }
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.distribution.findMany({
    where,
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
