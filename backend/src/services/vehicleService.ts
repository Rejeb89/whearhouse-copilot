import prisma from '../config/database'
import { vehicleSchema, type CreateVehicleInput, type UpdateVehicleInput } from '../validation'

export { vehicleSchema }

export const listVehicles = async () => {
  return prisma.vehicle.findMany({
    include: { entity: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export const getVehicleById = async (id: number) => {
  return prisma.vehicle.findUnique({
    where: { id },
    include: { entity: { select: { id: true, name: true } } },
  })
}

export const createVehicle = async (data: CreateVehicleInput) => {
  return prisma.vehicle.create({
    data,
    include: { entity: { select: { id: true, name: true } } },
  })
}

export const updateVehicle = async (id: number, data: UpdateVehicleInput) => {
  return prisma.vehicle.update({
    where: { id },
    data,
    include: { entity: { select: { id: true, name: true } } },
  })
}

export const deleteVehicle = async (id: number) => {
  await prisma.vehicle.delete({ where: { id } })
}
