import { Request, Response } from 'express'
import * as vehicleService from '../services/vehicleService'
import { humanizePrismaError } from '../utils/prismaError'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const vehicles = await vehicleService.listVehicles(getSU(req))
    res.json({ data: vehicles })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleService.getVehicleById(Number(req.params.id), getSU(req))
    if (!vehicle) return res.status(404).json({ error: 'غير موجود' })
    res.json({ data: vehicle })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const su = (req as any).user?.securityUnit
    const vehicle = await vehicleService.createVehicle(req.body, su)
    res.status(201).json({ data: vehicle })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleService.updateVehicle(Number(req.params.id), req.body, getSU(req))
    res.json({ data: vehicle })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await vehicleService.deleteVehicle(Number(req.params.id), getSU(req))
    res.json({ ok: true })
  } catch (err: any) {
    res.status(400).json({ error: humanizePrismaError(err) })
  }
}
