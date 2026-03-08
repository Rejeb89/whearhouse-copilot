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

const normalizeVehicleData = (data: CreateVehicleInput | UpdateVehicleInput) => {
  const { breakdownDate, ...rest } = data as any
  return {
    ...rest,
    ...(breakdownDate !== undefined
      ? { breakdownDate: breakdownDate ? new Date(breakdownDate) : null }
      : {}),
  }
}

export const createVehicle = async (data: CreateVehicleInput, securityUnit?: string | null) => {
  return prisma.vehicle.create({
    data: { ...normalizeVehicleData(data), securityUnit: securityUnit ?? null },
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
    data: normalizeVehicleData(data),
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
