import { Request, Response } from 'express'
import * as entityService from '../services/entityService'
import { humanizePrismaError } from '../utils/prismaError'

const getSU = (req: Request) => {
  const u = (req as any).user
  return u?.role === 'ADMIN' ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as 'SUPPLIER' | 'BENEFICIARY' | undefined
    const entities = await entityService.getEntities(type, getSU(req))
    res.json({ data: entities })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const entity = await entityService.getEntityById(parseInt(req.params.id), getSU(req))
    if (!entity) return res.status(404).json({ error: 'Entity not found' })
    res.json({ data: entity })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const distributionsCount = async (req: Request, res: Response) => {
  try {
    const count = await entityService.getDistributionsCount(parseInt(req.params.id), getSU(req))
    res.json({ data: { distributionCount: count } })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const su = (req as any).user?.securityUnit
    const { name, type, category, subCategory, phone, unitHead, unitHeadPhone } = req.body
    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const entity = await entityService.createEntity({
      name, type, category, subCategory, phone: phone || '', unitHead, unitHeadPhone,
    }, su)
    res.status(201).json({ data: entity })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { name, category, subCategory, phone, unitHead, unitHeadPhone, type: bodyType } = req.body
    const entity = await entityService.updateEntity(parseInt(req.params.id), {
      name, type: bodyType, category, subCategory, phone, unitHead, unitHeadPhone,
    }, getSU(req))
    res.json({ data: entity })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await entityService.deleteEntity(parseInt(req.params.id), getSU(req))
    res.json({ message: 'Entity deleted successfully' })
  } catch (error: any) {
    res.status(400).json({ error: humanizePrismaError(error) })
  }
}
