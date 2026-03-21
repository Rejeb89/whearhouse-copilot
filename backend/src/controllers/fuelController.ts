import { Request, Response } from 'express'
import * as fuelService from '../services/fuelService'

const UNRESTRICTED_ROLES = ['ADMIN', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']
const getSU = (req: Request) => {
  const u = (req as any).user
  return UNRESTRICTED_ROLES.includes(u?.role) ? undefined : (u?.securityUnit ?? undefined)
}

// ─── Prices ──────────────────────────────────────────────────────────────────

export const listPrices = async (_req: Request, res: Response) => {
  try {
    const prices = await fuelService.listFuelPrices()
    res.json({ data: prices })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const upsertPrice = async (req: Request, res: Response) => {
  try {
    const { fuelType, pricePerLiter } = req.body
    if (!fuelType || pricePerLiter == null) return res.status(400).json({ error: 'fuelType و pricePerLiter مطلوبان' })
    const price = await fuelService.upsertFuelPrice(fuelType, Number(pricePerLiter))
    res.json({ data: price })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

// ─── Records ─────────────────────────────────────────────────────────────────

export const listRecords = async (req: Request, res: Response) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1
    const year  = Number(req.query.year)  || new Date().getFullYear()
    const vehicles = await fuelService.listVehiclesWithRecords(month, year, getSU(req))
    res.json({ data: vehicles })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const upsertRecord = async (req: Request, res: Response) => {
  try {
    const record = await fuelService.upsertFuelRecord(req.body)
    res.json({ data: record })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const deleteRecord = async (req: Request, res: Response) => {
  try {
    await fuelService.deleteFuelRecord(Number(req.params.id))
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const yearlyStats = async (req: Request, res: Response) => {
  try {
    const year     = Number(req.query.year) || new Date().getFullYear()
    const fuelType = req.query.fuelType as string | undefined
    const data = await fuelService.getYearlyStats(year, getSU(req), fuelType)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
