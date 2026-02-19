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
  await prisma.item.delete({ where: { id } })
  await createLog('DELETE', 'Item', id, null)
  return true
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
