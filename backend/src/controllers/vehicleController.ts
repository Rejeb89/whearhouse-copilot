import { Request, Response } from 'express'
import * as vehicleService from '../services/vehicleService'

export const list = async (_req: Request, res: Response) => {
  try {
    const vehicles = await vehicleService.listVehicles()
    res.json({ data: vehicles })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleService.getVehicleById(Number(req.params.id))
    if (!vehicle) return res.status(404).json({ error: 'غير موجود' })
    res.json({ data: vehicle })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleService.createVehicle(req.body)
    res.status(201).json({ data: vehicle })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleService.updateVehicle(Number(req.params.id), req.body)
    res.json({ data: vehicle })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await vehicleService.deleteVehicle(Number(req.params.id))
    res.json({ ok: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
