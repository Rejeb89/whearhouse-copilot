import prisma from '../config/database'
import type { Prisma } from '@prisma/client'
import { createLog } from './logService'
import { adjustStock } from './itemService'

export const createReception = async (userId: number, reference: string, items: { itemId?: number; itemName?: string; category?: string; quantity: number; lowStockThreshold?: number; adminNumber?: string }[], data?: { referenceNumber?: string; referenceType?: string; referenceDate?: Date; supplierId?: number; collectorId?: number; notes?: string }, securityUnit?: string | null) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const reception = await tx.reception.create({ 
        data: { 
          reference, 
          userId,
          referenceNumber: data?.referenceNumber,
          referenceType: data?.referenceType,
          referenceDate: data?.referenceDate,
          supplierId: data?.supplierId,
          collectorId: data?.collectorId,
          notes: data?.notes,
          securityUnit: securityUnit ?? null,
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
                sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                securityUnit: securityUnit ?? null,
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
      
      await createLog('CREATE', 'Reception', reception.id, userId, securityUnit)
      return reception
    })
  } catch (error: any) {
    if (error?.code === 'P2002' && error?.meta?.target?.includes('reference')) {
      throw new Error('رقم المرجع مستخدم مسبقاً، يرجى استخدام مرجع مختلف')
    }
    throw error
  }
}

export const getReferenceTypes = async (securityUnit?: string | null) => {
  const where: any = { referenceType: { not: null } }
  if (securityUnit) where.securityUnit = securityUnit
  const types = await prisma.reception.findMany({
    where,
    select: { referenceType: true },
    distinct: ['referenceType'],
    orderBy: { referenceType: 'asc' }
  })
  return types.map((t: any) => t.referenceType).filter(Boolean)
}

export const getLatestReceptionByItem = async (itemId: number, securityUnit?: string | null) => {
  const where: any = { itemId }
  if (securityUnit) where.reception = { securityUnit }
  const receptionItem = await prisma.receptionItem.findFirst({
    where,
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

// جديد: جلب جميع المراجع للصنف مع الكميات المتاحة (مرتبة من الأقدم)
export const getReceptionsWithAvailableQtyByItem = async (itemId: number, securityUnit?: string | null) => {
  // 1. جلب جميع المراجع الاستقبالية للصنف
  const where: any = { itemId }
  if (securityUnit) where.reception = { securityUnit }
  
  const receptionItems = await prisma.receptionItem.findMany({
    where,
    orderBy: { reception: { createdAt: 'asc' } }, // الأقدم أولاً
    include: {
      reception: {
        select: {
          id: true,
          referenceType: true,
          referenceNumber: true,
          referenceDate: true,
          reference: true,
          notes: true,
          supplier: { select: { id: true, name: true } },
          createdAt: true,
        }
      }
    }
  })

  // 2. لكل مرجع، حساب الكمية المستخرجة منه
  const result = await Promise.all(
    receptionItems.map(async (ri) => {
      // جمع الكميات المستخرجة من هذا المرجع (نفس نوع ورقم وتاريخ المرجع)
      const used = await prisma.distributionItem.aggregate({
        where: {
          itemId,
          distribution: {
            referenceType: ri.reception.referenceType,
            referenceNumber: ri.reception.referenceNumber,
            referenceDate: ri.reception.referenceDate,
          }
        },
        _sum: { quantity: true }
      })

      const usedQty = used._sum.quantity || 0
      const availableQty = ri.quantity - usedQty

      return {
        id: ri.reception.id,
        itemId,
        receptionQty: ri.quantity,
        usedQty,
        availableQty,
        referenceType: ri.reception.referenceType,
        referenceNumber: ri.reception.referenceNumber,
        referenceDate: ri.reception.referenceDate,
        reference: ri.reception.reference,
        supplier: ri.reception.supplier,
        createdAt: ri.reception.createdAt,
        notes: ri.reception.notes,
      }
    })
  )

  // 3. فلترة المراجع التي لا تزال فيها كميات متاحة
  return result.filter(r => r.availableQty > 0)
}

export const recentReceptions = (limit = 10, securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.reception.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, include: { items: { include: { item: true } }, supplier: true } })
}

export const getAllReceptions = async (filters?: { search?: string; referenceType?: string; dateFrom?: string; dateTo?: string }, securityUnit?: string | null) => {
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
export const getReceptionsBySupplier = async (supplierId: number, securityUnit?: string | null) => {
  const where: any = { supplierId }
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.reception.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { item: true } },
      supplier: true,
      collector: true,
      user: { select: { id: true, email: true, name: true } },
    },
  })
}