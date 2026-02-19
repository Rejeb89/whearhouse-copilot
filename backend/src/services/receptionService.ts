import prisma from '../prisma'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'
import { adjustStock } from './itemService'

export const createReception = async (userId: number, reference: string, items: { itemId?: number; itemName?: string; category?: string; quantity: number; lowStockThreshold?: number }[], data?: { referenceNumber?: string; referenceDate?: Date; supplierId?: number; notes?: string }) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const reception = await tx.reception.create({ 
      data: { 
        reference, 
        userId,
        referenceNumber: data?.referenceNumber,
        referenceDate: data?.referenceDate,
        supplierId: data?.supplierId,
        notes: data?.notes
      } 
    })
    
    for (const it of items) {
      let itemId = it.itemId
      
      // إذا لم يكن الـ itemId موجوداً، ننشئ عنصر جديد
      if (!itemId && it.itemName) {
        const newItem = await tx.item.create({
          data: {
            name: it.itemName,
            category: it.category || 'بدون صنف',
            lowStockThreshold: it.lowStockThreshold || 0,
            quantity: 0,
            sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          }
        })
        itemId = newItem.id
      }
      
      if (itemId) {
        await tx.receptionItem.create({ data: { receptionId: reception.id, itemId: itemId, quantity: it.quantity } })
        // increase stock
        await tx.item.update({ where: { id: itemId }, data: { quantity: { increment: it.quantity } } })
      }
    }
    
    await createLog('CREATE', 'Reception', reception.id, userId)
    return reception
  })
}

export const recentReceptions = (limit = 10) => prisma.reception.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { items: { include: { item: true } }, supplier: true } })
