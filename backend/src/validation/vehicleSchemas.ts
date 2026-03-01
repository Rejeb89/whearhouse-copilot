import { z } from 'zod'

export const vehicleSchema = z.object({
  adminNumber: z.string().min(1),
  type:        z.string().min(1),
  fuelType:    z.string().min(1),
  entityId:    z.number().int().positive(),
  notes:       z.string().optional(),
})

export type CreateVehicleInput = z.infer<typeof vehicleSchema>
export type UpdateVehicleInput = Partial<CreateVehicleInput>
