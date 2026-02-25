import { Router } from 'express'
import { z } from 'zod'
import { authGuard } from '../middleware/authGuard'
import prisma from '../prisma'

const router = Router()

const vehicleSchema = z.object({
  adminNumber: z.string().min(1),
  type:        z.string().min(1),
  fuelType:    z.string().min(1),
  entityId:    z.number().int().positive(),
  notes:       z.string().optional(),
})

// GET /api/vehicles  – list all with entity
router.get('/', authGuard, async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: { entity: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: vehicles })
})

// GET /api/vehicles/:id
router.get('/:id', authGuard, async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(req.params.id) },
    include: { entity: { select: { id: true, name: true } } },
  })
  if (!vehicle) return res.status(404).json({ error: 'غير موجود' })
  res.json({ data: vehicle })
})

// POST /api/vehicles
router.post('/', authGuard, async (req, res) => {
  try {
    const data = vehicleSchema.parse(req.body)
    const vehicle = await prisma.vehicle.create({
      data,
      include: { entity: { select: { id: true, name: true } } },
    })
    res.status(201).json({ data: vehicle })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// PATCH /api/vehicles/:id
router.patch('/:id', authGuard, async (req, res) => {
  try {
    const data = vehicleSchema.partial().parse(req.body)
    const vehicle = await prisma.vehicle.update({
      where: { id: Number(req.params.id) },
      data,
      include: { entity: { select: { id: true, name: true } } },
    })
    res.json({ data: vehicle })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /api/vehicles/:id
router.delete('/:id', authGuard, async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: Number(req.params.id) } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
