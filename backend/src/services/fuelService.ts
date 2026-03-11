import prisma from '../config/database'

// ─── Fuel Prices ─────────────────────────────────────────────────────────────

export const listFuelPrices = async () => {
  return prisma.fuelPrice.findMany({ orderBy: { fuelType: 'asc' } })
}

export const upsertFuelPrice = async (fuelType: string, pricePerLiter: number) => {
  return prisma.fuelPrice.upsert({
    where: { fuelType },
    update: { pricePerLiter },
    create: { fuelType, pricePerLiter },
  })
}

// ─── Fuel Records ─────────────────────────────────────────────────────────────

export const listVehiclesWithRecords = async (
  month: number,
  year: number,
  securityUnit?: string | null
) => {
  const vehicleWhere: any = {}
  if (securityUnit) vehicleWhere.securityUnit = securityUnit

  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere,
    include: {
      entity: { select: { id: true, name: true } },
      fuelRecords: { where: { month, year } },
    },
    orderBy: { adminNumber: 'asc' },
  })

  return vehicles
}

export const upsertFuelRecord = async (data: {
  vehicleId: number
  month: number
  year: number
  monthlyQuotaLiters?: number
  deliveredAmount?: number | null
  additionalAmount?: number | null
  consumedAmount?: number | null
  startMileage?: number | null
  endMileage?: number | null
  notes?: string | null
}) => {
  const { vehicleId, month, year, ...rest } = data

  // Auto-fill startMileage from previous month's endMileage if not provided
  if (rest.startMileage === undefined || rest.startMileage === null) {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear  = month === 1 ? year - 1 : year
    const prev = await prisma.fuelRecord.findUnique({
      where: { vehicleId_month_year: { vehicleId, month: prevMonth, year: prevYear } },
    })
    if (prev?.endMileage) rest.startMileage = prev.endMileage
  }

  return prisma.fuelRecord.upsert({
    where: { vehicleId_month_year: { vehicleId, month, year } },
    update: rest,
    create: { vehicleId, month, year, ...rest },
    include: {
      vehicle: { select: { id: true, adminNumber: true, fuelType: true, fuelQuota: true } },
    },
  })
}

export const deleteFuelRecord = async (id: number) => {
  return prisma.fuelRecord.delete({ where: { id } })
}

// إحصائيات سنوية شهرية
export const getYearlyStats = async (
  year: number,
  securityUnit?: string | null,
  fuelType?: string
) => {
  const vehicleWhere: any = {}
  if (securityUnit) vehicleWhere.securityUnit = securityUnit
  if (fuelType)     vehicleWhere.fuelType     = fuelType

  const records = await prisma.fuelRecord.findMany({
    where: { year, vehicle: Object.keys(vehicleWhere).length ? vehicleWhere : undefined },
    include: { vehicle: { select: { fuelType: true, fuelQuota: true } } },
  })

  const monthly: Record<number, { consumed: number; delivered: number }> = {}
  for (let m = 1; m <= 12; m++) monthly[m] = { consumed: 0, delivered: 0 }

  records.forEach(r => {
    if (r.consumedAmount  != null) monthly[r.month].consumed  += r.consumedAmount
    if (r.deliveredAmount != null) monthly[r.month].delivered += r.deliveredAmount
  })

  return Array.from({ length: 12 }, (_, i) => ({
    month:     i + 1,
    consumed:  +monthly[i + 1].consumed.toFixed(2),
    delivered: +monthly[i + 1].delivered.toFixed(2),
  }))
}
