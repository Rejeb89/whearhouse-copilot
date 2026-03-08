import prisma from '../config/database'
import { vehicleSchema, type CreateVehicleInput, type UpdateVehicleInput } from '../validation'

export { vehicleSchema }

export const listVehicles = async (securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.vehicle.findMany({
    where,
    include: { entity: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export const getVehicleById = async (id: number, securityUnit?: string | null) => {
  const where: any = { id }
  if (securityUnit) where.securityUnit = securityUnit
  return prisma.vehicle.findFirst({
    where,
    include: { entity: { select: { id: true, name: true } } },
  })
}

export const createVehicle = async (data: CreateVehicleInput, securityUnit?: string | null) => {
  return prisma.vehicle.create({
    data: { ...data, securityUnit: securityUnit ?? null },
    include: { entity: { select: { id: true, name: true } } },
  })
}

export const updateVehicle = async (id: number, data: UpdateVehicleInput, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.vehicle.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('المركبة غير موجودة أو لا يمكنك تعديلها')
  }
  return prisma.vehicle.update({
    where: { id },
    data,
    include: { entity: { select: { id: true, name: true } } },
  })
}

export const deleteVehicle = async (id: number, securityUnit?: string | null) => {
  if (securityUnit) {
    const existing = await prisma.vehicle.findFirst({ where: { id, securityUnit } })
    if (!existing) throw new Error('المركبة غير موجودة أو لا يمكنك حذفها')
  }
  await prisma.vehicle.delete({ where: { id } })
}
