import prisma from '../prisma'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'
import { adjustStock } from './itemService'

export const createReception = async (userId: number, reference: string, items: { itemId?: number; itemName?: string; category?: string; quantity: number; lowStockThreshold?: number; adminNumber?: string }[], data?: { referenceNumber?: string; referenceType?: string; referenceDate?: Date; supplierId?: number; collectorId?: number; notes?: string }) => {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reception = await tx.reception.create({ 
        data: { 
          reference, 
          userId,
          referenceNumber: data?.referenceNumber,
          referenceType: data?.referenceType,
          referenceDate: data?.referenceDate,
          supplierId: data?.supplierId,
          collectorId: data?.collectorId,
          notes: data?.notes
        } 
      })
      
      for (const it of items) {
        let itemId = it.itemId
        
        if (!itemId && it.itemName) {
          // البحث عن تجهيز موجود بنفس الاسم والصنف
          const existingItem = await tx.item.findFirst({
            where: {
              name: { equals: it.itemName, mode: 'insensitive' },
              category: it.category || 'بدون صنف'
            }
          })
          
          if (existingItem) {
            // تجهيز موجود: نستخدمه وتُضاف الكمية
            itemId = existingItem.id
          } else {
            // تجهيز جديد: إنشاؤه
            const newItem = await tx.item.create({
              data: {
                name: it.itemName,
                category: it.category || 'بدون صنف',
                lowStockThreshold: it.lowStockThreshold ?? 5,
                quantity: 0,
                sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
              }
            })
            itemId = newItem.id
          }
        }
        
        if (itemId) {
          await tx.receptionItem.create({ data: { receptionId: reception.id, itemId, quantity: it.quantity, adminNumber: it.adminNumber } })
          await tx.item.update({ where: { id: itemId }, data: { quantity: { increment: it.quantity } } })
        }
      }
      
      await createLog('CREATE', 'Reception', reception.id, userId)
      return reception
    })
  } catch (error: any) {
    if (error?.code === 'P2002' && error?.meta?.target?.includes('reference')) {
      throw new Error('رقم المرجع مستخدم مسبقاً، يرجى استخدام مرجع مختلف')
    }
    throw error
  }
}

export const getReferenceTypes = async () => {
  const types = await prisma.reception.findMany({
    where: { referenceType: { not: null } },
    select: { referenceType: true },
    distinct: ['referenceType'],
    orderBy: { referenceType: 'asc' }
  })
  return types.map((t: any) => t.referenceType).filter(Boolean)
}

export const getLatestReceptionByItem = async (itemId: number) => {
  const receptionItem = await prisma.receptionItem.findFirst({
    where: { itemId },
    orderBy: { reception: { createdAt: 'desc' } },
    include: {
      reception: {
        select: {
          referenceType: true,
          referenceNumber: true,
          referenceDate: true,
          reference: true,
          notes: true,
          supplier: { select: { name: true } },
          createdAt: true,
        }
      }
    }
  })
  return receptionItem?.reception ?? null
}

export const recentReceptions = (limit = 10) => prisma.reception.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { items: { include: { item: true } }, supplier: true } })

export const getAllReceptions = async (filters?: { search?: string; referenceType?: string; dateFrom?: string; dateTo?: string }) => {
  const where: any = {}
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
  const list = await prisma.reception.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { item: true } },
      supplier: true,
      collector: true
    }
  })
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    return list.filter((r: any) =>
      r.items.some((ri: any) => ri.item?.name?.toLowerCase().includes(q)) ||
      (r.referenceNumber || '').toLowerCase().includes(q) ||
      (r.referenceType || '').toLowerCase().includes(q) ||
      (r.supplier?.name || '').toLowerCase().includes(q) ||
      (r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname}`.toLowerCase().includes(q) : false)
    )
  }
  return list
}
export const getReceptionsBySupplier = async (supplierId: number) => {
  return prisma.reception.findMany({
    where: { supplierId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { item: true } },
      supplier: true,
      collector: true,
      user: { select: { id: true, email: true, name: true } },
    },
  })
}