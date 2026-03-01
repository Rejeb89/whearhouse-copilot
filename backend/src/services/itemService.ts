import prisma from '../config/database'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'
import { LOW_STOCK_THRESHOLD } from '../config'

export const listItems = () => prisma.item.findMany()

export const getItem = (id: number) => prisma.item.findUnique({ where: { id } })

export const createItem = async (data: { name: string; sku: string; category?: string; description?: string; quantity?: number; lowStockThreshold?: number }) => {
  const item = await prisma.item.create({ data: { ...data } })
  await createLog('CREATE', 'Item', item.id, null)
  return item
}

export const updateItem = async (id: number, data: any) => {
  const item = await prisma.item.update({ where: { id }, data })
  await createLog('UPDATE', 'Item', item.id, null)
  return item
}

export const deleteItem = async (id: number) => {
  // Check if item has any distribution items (prevent deletion if it does)
  const distributionCount = await prisma.distributionItem.count({
    where: { itemId: id }
  })
  
  if (distributionCount > 0) {
    throw new Error(`لا يمكن حذف هذا التجهيز. يوجد ${distributionCount} عملية تسليم مرتبطة به`)
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Delete all reception items for this item (allowed even if exist)
    await tx.receptionItem.deleteMany({ where: { itemId: id } })
    
    // Delete the item itself
    await tx.item.delete({ where: { id } })
  })
  
  await createLog('DELETE', 'Item', id, null)
  return true
}

export const getItemAdminNumbers = async (id: number) => {
  const rows = await prisma.receptionItem.findMany({
    where: { itemId: id, adminNumber: { not: null } },
    select: { adminNumber: true },
    distinct: ['adminNumber'],
  })
  return rows.map(r => r.adminNumber as string)
}

export const getItemHistory = async (id: number) => {
  const [receptions, distributions] = await Promise.all([
    prisma.receptionItem.findMany({
      where: { itemId: id },
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
      where: { itemId: id },
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
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

export const getInventorySummary = async () => {
  const items = await prisma.item.findMany({
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
