import prisma from '../prisma'

export const createEntity = async (data: {
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
  category?: string
  subCategory?: string
  phone: string
  unitHead?: string
  unitHeadPhone?: string
}) => {
  return prisma.entity.create({
    data: {
      name: data.name,
      type: data.type,
      category: data.category || 'OTHER',
      subCategory: data.subCategory,
      phone: data.phone,
      unitHead: data.unitHead,
      unitHeadPhone: data.unitHeadPhone,
    }
  })
}

export const getEntities = async (type?: 'SUPPLIER' | 'BENEFICIARY') => {
  return prisma.entity.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: 'desc' }
  })
}

export const getEntityById = async (id: number) => {
  return prisma.entity.findUnique({
    where: { id }
  })
}

export const updateEntity = async (id: number, data: {
  name?: string
  type?: 'SUPPLIER' | 'BENEFICIARY'
  category?: string
  subCategory?: string
  phone?: string
  unitHead?: string
  unitHeadPhone?: string
}) => {
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

export const deleteEntity = async (id: number) => {
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

export const getDistributionsCount = async (id: number) => {
  return prisma.distribution.count({
    where: { beneficiaryId: id }
  })
}
