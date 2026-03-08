import { z } from 'zod'

export const vehicleSchema = z.object({
  adminNumber:   z.string().min(1),
  type:          z.string().min(1),
  fuelType:      z.string().min(1),
  fuelQuota:     z.number().positive().optional().nullable(),
  status:        z.enum(['OPERATIONAL', 'BROKEN']).optional().default('OPERATIONAL'),
  breakdownRef:  z.string().optional().nullable(),
  breakdownDate: z.string().optional().nullable(),   // ISO string from client
  entityId:      z.number().int().positive(),
  notes:         z.string().optional(),
})

export type CreateVehicleInput = z.infer<typeof vehicleSchema>
export type UpdateVehicleInput = Partial<CreateVehicleInput>
