import prisma from '../config/database'

export const createEntity = async (data: {
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
  category?: string
  subCategory?: string
  phone: string
  unitHead?: string
  unitHeadPhone?: string
}, securityUnit?: string | null) => {
  return prisma.entity.create({
    data: {
      name: data.name,
      type: data.type,
      category: data.category || 'OTHER',
      subCategory: data.subCategory,
      phone: data.phone,
      unitHead: data.unitHead,
      unitHeadPhone: data.unitHeadPhone,
      securityUnit: securityUnit ?? null,
    }
  })
}

export const getEntities = async (type?: 'SUPPLIER' | 'BENEFICIARY', securityUnit?: string | null) => {
  const where: any = {}
  if (type) where.type = type
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.entity.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })
}

export const getEntityById = async (id: number, securityUnit?: string | null) => {
  const where: any = { id }
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.entity.findFirst({ where })
}

export const updateEntity = async (id: number, data: {
  name?: string
  type?: 'SUPPLIER' | 'BENEFICIARY'
  category?: string
  subCategory?: string
  phone?: string
  unitHead?: string
  unitHeadPhone?: string
}, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.entity.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('الجهة غير موجودة أو لا يمكنك تعديلها')
  }
  return prisma.entity.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      category: data.category,
      subCategory: data.subCategory,
      phone: data.phone,
      unitHead: data.unitHead,
      unitHeadPhone: data.unitHeadPhone,
    }
  })
}

export const deleteEntity = async (id: number, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.entity.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('الجهة غير موجودة أو لا يمكنك حذفها')
  }
  // Check if entity has any distributions
  const distributionCount = await prisma.distribution.count({
    where: { beneficiaryId: id }
  })
  
  if (distributionCount > 0) {
    throw new Error(`لا يمكن حذف هذه الجهة لأنها مرتبطة بـ ${distributionCount} عملية خرج`)
  }

  // Check if entity has any receptions (as supplier)
  const receptionCount = await prisma.reception.count({
    where: { supplierId: id }
  })

  if (receptionCount > 0) {
    throw new Error(`لا يمكن حذف هذه الجهة لأنها مرتبطة بـ ${receptionCount} عملية دخل`)
  }

  return prisma.entity.delete({
    where: { id }
  })
}

export const getDistributionsCount = async (id: number, securityUnit?: string | null) => {
  const where: any = { beneficiaryId: id }
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.distribution.count({ where })
}
