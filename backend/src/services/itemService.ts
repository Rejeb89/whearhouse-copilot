import prisma from '../prisma'
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
