import prisma from '../config/database'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'
import { LOW_STOCK_THRESHOLD } from '../config'

export const listItems = (securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.item.findMany({ where })
}

export const getItem = (id: number, securityUnit?: string | null) => {
  const where: any = { id }
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.item.findFirst({ where })
}

export const createItem = async (data: { name: string; sku: string; category?: string; description?: string; quantity?: number; lowStockThreshold?: number }, securityUnit?: string | null) => {
  const item = await prisma.item.create({ data: { ...data, securityUnit: securityUnit ?? null } })
  await createLog('CREATE', 'Item', item.id, null, securityUnit)
  return item
}

export const updateItem = async (id: number, data: any, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.item.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('العنصر غير موجود أو لا يمكنك تعديله')
  }
  const item = await prisma.item.update({ where: { id }, data })
  await createLog('UPDATE', 'Item', item.id, null, securityUnit)
  return item
}

export const deleteItem = async (id: number, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.item.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('العنصر غير موجود أو لا يمكنك حذفه')
  }
  const distributionCount = await prisma.distributionItem.count({
    where: { itemId: id }
  })
  
  if (distributionCount > 0) {
    throw new Error(`لا يمكن حذف هذا التجهيز. يوجد ${distributionCount} عملية تسليم مرتبطة به`)
  }

  await prisma.$transaction(async (tx) => {
    await tx.receptionItem.deleteMany({ where: { itemId: id } })
    await tx.item.delete({ where: { id } })
  })
  
  await createLog('DELETE', 'Item', id, null, securityUnit)
  return true
}

export const getItemAdminNumbers = async (id: number, securityUnit?: string | null) => {
  const where: any = { itemId: id, adminNumber: { not: null } }
  if (securityUnit) where.reception = { securityUnit }
  const rows = await prisma.receptionItem.findMany({
    where,
    select: { adminNumber: true },
    distinct: ['adminNumber'],
  })
  return rows.map(r => r.adminNumber as string)
}

export const getItemHistory = async (id: number, securityUnit?: string | null) => {
  const recWhere: any = { itemId: id }
  const distWhere: any = { itemId: id }
  if (securityUnit) {
    recWhere.reception = { securityUnit }
    distWhere.distribution = { securityUnit }
  }
  const [receptions, distributions] = await Promise.all([
    prisma.receptionItem.findMany({
      where: recWhere,
      include: {
        reception: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            supplier: { select: { id: true, name: true } },
          }
        }
      },
      orderBy: { reception: { createdAt: 'desc' } }
    }),
    prisma.distributionItem.findMany({
      where: distWhere,
      include: {
        distribution: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            beneficiary: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true, surname: true, rank: true } },
            receipt: { select: { id: true, serialNumber: true, status: true, issuedAt: true } },
          }
        }
      },
      orderBy: { distribution: { createdAt: 'desc' } }
    })
  ])
  return { receptions, distributions }
}

export const adjustStock = async (itemId: number, quantityDelta: number) => {
  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: itemId } })
    if (!item) throw new Error('Item not found')
    const newQty = item.quantity + quantityDelta
    if (newQty < 0) throw new Error('Insufficient stock')
    const updated = await tx.item.update({ where: { id: itemId }, data: { quantity: newQty } })
    if ((updated.lowStockThreshold ?? LOW_STOCK_THRESHOLD) >= newQty) {
      // low stock; could emit notification later
    }
    return updated
  })
}

export const getInventorySummary = async (securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  const items = await prisma.item.findMany({
    where,
    include: {
      receptionItems: {
        include: {
          reception: {
            include: {
              supplier: { select: { id: true, name: true } },
            },
          },
        },
      },
      distributionItems: {
        include: {
          distribution: {
            include: {
              beneficiary: { select: { id: true, name: true } },
              assignedTo:  { select: { id: true, name: true, surname: true, rank: true } },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return items.map(item => {
    const totalReceived    = item.receptionItems.reduce((s, ri) => s + ri.quantity, 0)
    const totalDistributed = item.distributionItems.reduce((s, di) => s + di.quantity, 0)

    const receptions = item.receptionItems.map(ri => ({
      receptionId:     ri.receptionId,
      quantity:        ri.quantity,
      adminNumber:     ri.adminNumber,
      referenceType:   ri.reception.referenceType,
      referenceNumber: ri.reception.referenceNumber,
      referenceDate:   ri.reception.referenceDate,
      supplierName:    ri.reception.supplier?.name ?? null,
      createdAt:       ri.reception.createdAt,
    }))

    const distributions = item.distributionItems.map(di => ({
      distributionId:  di.distributionId,
      quantity:        di.quantity,
      adminNumber:     di.adminNumber,
      referenceType:   di.distribution.referenceType,
      referenceNumber: di.distribution.referenceNumber,
      referenceDate:   di.distribution.referenceDate,
      beneficiaryName: di.distribution.beneficiary?.name ?? null,
      assignedTo:      di.distribution.assignedTo
        ? `${di.distribution.assignedTo.rank ?? ''} ${di.distribution.assignedTo.name} ${di.distribution.assignedTo.surname}`.trim()
        : null,
      createdAt:       di.distribution.createdAt,
    }))

    return {
      id:               item.id,
      name:             item.name,
      sku:              item.sku,
      category:         item.category,
      currentStock:     item.quantity,
      lowStockThreshold: item.lowStockThreshold,
      totalReceived,
      totalDistributed,
      receptions,
      distributions,
    }
  })
}
