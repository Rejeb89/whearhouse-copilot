import prisma from '../prisma'

export const createEntity = async (data: {
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
  phone: string
  unitHead?: string
  unitHeadPhone?: string
}) => {
  return prisma.entity.create({
    data: {
      name: data.name,
      type: data.type,
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
  phone?: string
  unitHead?: string
  unitHeadPhone?: string
}) => {
  return prisma.entity.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      unitHead: data.unitHead,
      unitHeadPhone: data.unitHeadPhone,
    }
  })
}

export const deleteEntity = async (id: number) => {
  return prisma.entity.delete({
    where: { id }
  })
}
